// Adds today's downloads and GitHub stars of every repository to the history the Featured box on
// the start page and the milestone celebrations (assets/js/milestones.js) read, and keeps the last
// 35 days. .github/workflows/download-counts.yml runs it once a day and keeps the file on the stats
// branch: { updated, days: { 'YYYY-MM-DD': { repository: downloads } }, stars: { same with stars } }
//   node _tools/download-counts.js <downloads.json>
const fs = require('fs');
const file = process.argv[2];
const user = process.env.GITHUB_REPOSITORY_OWNER || 'aaskjer';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'download-counts' };
if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;

// every page of a GitHub list
async function getAll(url) {
  const all = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`${url}&page=${page}`, { headers });
    if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`);
    const items = await response.json();
    all.push(...items);
    if (items.length < 100) return all;
  }
}

(async () => {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
  const old = text ? JSON.parse(text) : {};
  const days = old.days || {};
  const stars = old.stars || {};
  const repos = (await getAll(`https://api.github.com/users/${user}/repos?per_page=100`)).filter(r => !r.fork && !r.archived);
  const today = {};
  const starsToday = {};
  for (const r of repos) {
    starsToday[r.name.toLowerCase()] = r.stargazers_count;
    const releases = await getAll(`https://api.github.com/repos/${user}/${r.name}/releases?per_page=100`);
    today[r.name.toLowerCase()] = releases.reduce((sum, rel) => sum + rel.assets.reduce((n, a) => n + a.download_count, 0), 0);
  }
  const date = new Date().toISOString().slice(0, 10);
  days[date] = today;
  stars[date] = starsToday;
  const keep = all => Object.fromEntries(Object.keys(all).sort().slice(-35).map(d => [d, all[d]]));
  const history = { updated: new Date().toISOString(), days: keep(days), stars: keep(stars) };
  fs.writeFileSync(file, JSON.stringify(history, null, 1) + '\n');
  console.log(`${date}: ${repos.length} repositories, ${Object.keys(history.days).length} days kept`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
