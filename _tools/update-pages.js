// Writes each project's name, short description and features into its page's HTML, so search
// engines get real text, and rebuilds sitemap.xml. The description is the repository's About
// text on GitHub (the tagline in projects.js if GitHub cannot be reached).
// The link preview (what Discord, Slack and others show under a shared link) gets the latest
// version and the status: in the title, as labels, and as the colour of the preview's edge.
// .github/workflows/update-pages.yml runs it once a day and after every change to projects.js;
// by hand:  node _tools/update-pages.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
process.chdir(path.join(__dirname, '..'));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/js/projects.js', 'utf8'), ctx);
const { user, projects } = ctx.window.SITE;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// the labels of project.js and the colours of their badges; finished projects show no label
const STATUS = {
  dev: { label: 'In development', color: '#facc15' },
  complete: { label: 'Feature Complete', color: '#34d399' },
  done: { color: '#b69cff' },
};
// in the workflow a failed request stops the run, so the pages never fall back to old values
const strict = !!process.env.CI;
const headers = process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {};
const getJSON = async url => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`);
  return response.json();
};
const setMeta = (html, attr, name, value, file) => {
  const tag = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(">)`);
  if (!tag.test(html)) throw new Error(`no ${name} in ${file}`);
  return html.replace(tag, `$1${esc(value)}$2`);
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
  const file = `${p.page}index.html`;
  let html = fs.readFileSync(file, 'utf8');
  const features = (p.features || []).map(f =>
    `\n          <li><svg class="i" aria-hidden="true"><use href="../assets/img/icons.svg#i-check"/></svg><span>${esc(f)}</span></li>`).join('');
  const block = `    <!-- shown until project.js has built the page; search engines read it too -->
    <section class="project-hero">
      <div class="wrap">
        <h1>${esc(p.name)}</h1>
        <p class="project-hero__lead">${esc(p.tagline)}</p>${features ? `
        <ul class="features">${features}
        </ul>` : ''}
        <p class="doc-status">Loading…</p>
      </div>
    </section>`;
  // the first run replaces the bare "Loading…" line, later runs the block written before
  const placeholder = /    <p class="wrap doc-status">Loading…<\/p>|    <!-- shown until project\.js[\s\S]*?<\/section>/;
  if (!placeholder.test(html)) throw new Error(`no placeholder in ${file}`);
  html = html.replace(placeholder, block);

  // link preview: "TwitchSentry  •  v4.0.1"; the site name "aaskjer" shows above it
  const status = STATUS[p.status] || {};
  html = setMeta(html, 'property', 'og:title', [p.name, p.version].filter(Boolean).join('  •  '), file);
  // the colour of the preview's edge; theme.js gives browsers the page's background instead
  html = setMeta(html, 'name', 'theme-color', status.color || '#0b0a12', file);
  // Slack and others show these two as small columns under the description
  const labels = [['Version', p.version], ['Status', status.label]].filter(([, value]) => value)
    .map(([label, value], i) => `\n  <meta name="twitter:label${i + 1}" content="${label}">\n  <meta name="twitter:data${i + 1}" content="${esc(value)}">`).join('');
  html = html.replace(/\n  <meta name="twitter:(?:label|data)\d" content="[^"]*">/g, '');
  html = html.replace(/(<meta name="twitter:card" content="[^"]*">)/, `$1${labels}`);
  fs.writeFileSync(file, html);
  urls.push(p.page);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>https://aaskjer.github.io/${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync('sitemap.xml', sitemap);
console.log(`Updated ${urls.length - 2} project pages and sitemap.xml.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
