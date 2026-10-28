// Adds today's downloads of every repository to the history the Featured box on the start page
// reads, and keeps the last 35 days. .github/workflows/download-counts.yml runs it once a day and
// keeps the file on the stats branch.
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
  const days = text ? JSON.parse(text).days : {};
  const repos = (await getAll(`https://api.github.com/users/${user}/repos?per_page=100`)).filter(r => !r.fork && !r.archived);
  const today = {};
  for (const r of repos) {
    const releases = await getAll(`https://api.github.com/repos/${user}/${r.name}/releases?per_page=100`);
    today[r.name.toLowerCase()] = releases.reduce((sum, rel) => sum + rel.assets.reduce((n, a) => n + a.download_count, 0), 0);
  }
  const date = new Date().toISOString().slice(0, 10);
  days[date] = today;
  const kept = Object.keys(days).sort().slice(-35);
  const history = { updated: new Date().toISOString(), days: Object.fromEntries(kept.map(d => [d, days[d]])) };
  fs.writeFileSync(file, JSON.stringify(history, null, 1) + '\n');
  console.log(`${date}: ${repos.length} repositories, ${kept.length} days kept`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
