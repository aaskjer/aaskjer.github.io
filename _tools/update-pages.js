// Writes the page of every project with a `page` in projects.js from _tools/project-page.html,
// and rebuilds sitemap.xml. Each page carries the project's name, short description and features
// as plain text, so search engines get real text; the description is the repository's About text
// on GitHub (the tagline in projects.js if GitHub cannot be reached). The link preview (what
// Discord, Slack and others show under a shared link) gets the latest version: in the title and
// as a label.
// .github/workflows/update-pages.yml runs it once a day and after every change to projects.js or
// the template; by hand:  node _tools/update-pages.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
process.chdir(path.join(__dirname, '..'));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/js/projects.js', 'utf8'), ctx);
const { user, projects } = ctx.window.SITE;
const template = fs.readFileSync('_tools/project-page.html', 'utf8');
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// in the workflow a failed request stops the run, so the pages never fall back to old values
const strict = !!process.env.CI;
const headers = process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {};
const getJSON = async url => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`);
  return response.json();
};

(async () => {
const about = new Map();
try {
  for (const r of await getJSON(`https://api.github.com/users/${user}/repos?per_page=100`)) if (r.description) about.set(r.name.toLowerCase(), r.description);
} catch (e) {
  if (strict) throw e;
  console.warn(`About texts not loaded (${e.message}), using the taglines from projects.js.`);
}
const urls = ['', 'privacy.html'];
for (const p of projects.filter(x => x.page)) {
  // the template's links lead two folders up
  if (!/^projects\/[a-z0-9-]+\/$/.test(p.page)) throw new Error(`page of ${p.repo} is not 'projects/<folder>/'`);
  for (const field of ['description', 'preview']) if (!p[field]) throw new Error(`${p.repo} has no ${field}`);
  p.tagline = about.get(p.repo.toLowerCase()) || p.tagline;
  // the latest stable release, as on the site; a pre-release only while there is none
  try {
    const releases = (await getJSON(`https://api.github.com/repos/${user}/${p.repo}/releases?per_page=100`)).filter(r => !r.draft);
    const stable = releases.find(r => !r.prerelease);
    p.version = stable ? stable.tag_name : releases.length ? `${releases[0].tag_name} Pre-release` : null;
  } catch (e) {
    if (strict) throw e;
    console.warn(`Releases of ${p.repo} not loaded (${e.message}), using ${p.version || 'no version'} from projects.js.`);
  }
  const features = (p.features || []).map(f =>
    `\n          <li><svg class="i" aria-hidden="true"><use href="../../assets/img/icons.svg#i-check"/></svg><span>${esc(f)}</span></li>`).join('');
  const hero = `    <!-- shown until project.js has built the page; search engines read it too -->
    <section class="project-hero">
      <div class="wrap">
        <h1>${esc(p.name)}</h1>
        <p class="project-hero__lead">${esc(p.tagline)}</p>${features ? `
        <ul class="features">${features}
        </ul>` : ''}
        <p class="doc-status">Loading…</p>
      </div>
    </section>`;
  // Slack and others show it as a small column under the description
  const labels = p.version ? `\n  <meta name="twitter:label1" content="Version">\n  <meta name="twitter:data1" content="${esc(p.version)}">` : '';
  const values = {
    name: p.name, description: p.description, page: p.page, repo: p.repo, user,
    // link preview: "TwitchSentry  •  v4.0.1"; the site name "aaskjer" shows above it
    previewTitle: [p.name, p.version].filter(Boolean).join('  •  '),
    preview: p.preview,
    image: p.screenshot || p.scene,
  };
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === 'hero') return hero;
    if (key === 'labels') return labels;
    if (values[key] == null) throw new Error(`nothing for {{${key}}} on the page of ${p.repo}`);
    return esc(values[key]);
  });
  fs.mkdirSync(p.page, { recursive: true });
  fs.writeFileSync(`${p.page}index.html`, html);
  urls.push(p.page);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>https://aaskjer.github.io/${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync('sitemap.xml', sitemap);
console.log(`Wrote ${urls.length - 2} project pages and sitemap.xml.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
