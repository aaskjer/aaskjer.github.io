// Writes each project's name, tagline and features from projects.js into its page's HTML,
// so search engines and link previews get real text, and rebuilds sitemap.xml.
// Run it after changing those fields or adding a project page:  node _tools/update-pages.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
process.chdir(path.join(__dirname, '..'));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/js/projects.js', 'utf8'), ctx);
const { projects } = ctx.window.SITE;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const urls = ['', 'privacy.html'];
for (const p of projects.filter(x => x.page)) {
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
