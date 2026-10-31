// Writes the page of every project with a `page` in projects.js from _tools/project-page.html,
// the commands page (commands/), the help page (help/), the release feed feed.xml, the search index
// assets/search.json and sitemap.xml.
// Each page carries the project's documents (README, setup guide, manual, FAQ, changelog) already
// turned into HTML, so it shows them at once, search engines read them, and visitors without
// JavaScript too. It also carries what its import string adds to Streamer.bot (commands, actions,
// the web services its code calls), read from the import string itself. The description is the
// repository's About text on GitHub (the tagline in projects.js if GitHub cannot be reached). The
// link preview (what Discord, Slack and others show under a shared link) gets the latest version:
// in the title and as a label.
// .github/workflows/update-pages.yml runs it every hour and after every change to projects.js, the
// templates or _tools/problems.md; by hand:  node _tools/update-pages.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
process.chdir(path.join(__dirname, '..'));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/js/projects.js', 'utf8'), ctx);
const { user, projects } = ctx.window.SITE;
// the same copy of marked the pages load, so a document comes out as the browser would make it
const lib = {};
vm.runInNewContext(fs.readFileSync('assets/js/vendor/marked.umd.js', 'utf8'), lib);
const { marked } = lib;
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
const getText = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`);
  return response.text();
};
const encodePath = file => file.split('/').map(encodeURIComponent).join('/');
const rawUrl = (repo, file) => `https://raw.githubusercontent.com/${user}/${repo}/main/${encodePath(file)}`;

/* ---------- documents ---------- */

// The tabs of a project page, as in project.js (keep the two lists in step).
const DOCS = [
  { id: 'overview', label: 'Overview', file: 'README.md' },
  { id: 'setup', label: 'Setup guide', file: 'Setup-Guide.md' },
  { id: 'manual', label: 'Manual', file: 'Manual.md' },
  { id: 'faq', label: 'FAQ', file: 'FAQ.md' },
  { id: 'changelog', label: 'Changelog', file: 'CHANGELOG.md' },
];
// A line `<!-- tab: Setup -->` starts another tab there, as in project.js.
const TAB_MARKER = /^<!--[ \t]*tab:[ \t]*(.+?)[ \t]*-->[ \t]*\r?$/gim;

// Cuts a document at its tab markers, the way splitDoc in project.js does.
function splitDoc(doc, text, taken) {
  const pieces = text.split(TAB_MARKER);
  const parts = [{ ...doc, text: pieces[0] }];
  for (let i = 1; i < pieces.length; i += 2) {
    const label = pieces[i];
    let part = parts.find(x => x.label.toLowerCase() === label.toLowerCase());
    if (!part) {
      const base = label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'tab';
      let id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
      taken.add(id);
      parts.push(part = { ...doc, id, label, text: '' });
    }
    part.text += '\n\n' + pieces[i + 1];
  }
  return parts;
}

// Relative paths point into the repository: pictures to the file itself, links to GitHub, where
// project.js turns the ones to its own documents back into tabs. Badges from shields.io go.
function toHtml(markdown, repo, file, walk) {
  const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
  const fix = (url, picture) => {
    if (!url || url.startsWith('#')) return url;
    if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url)) {
      const blob = picture && url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/([^?#]+)/i);
      return blob ? `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}/${blob[4]}` : url;
    }
    const resolved = new URL(url, `https://repo/${dir}`);
    let target;
    try { target = decodeURIComponent(resolved.pathname.slice(1)); } catch (e) { target = resolved.pathname.slice(1); }
    return picture ? rawUrl(repo, target) + resolved.search
      : `https://github.com/${user}/${repo}/blob/main/${encodePath(target)}${resolved.hash}`;
  };
  const html = marked.parse(markdown, {
    gfm: true,
    walkTokens(token) {
      if (walk) walk(token);
      if (token.type === 'image' && /^https?:\/\/img\.shields\.io\//i.test(token.href)) {
        Object.assign(token, { type: 'html', text: '', raw: '' });
      } else if (token.type === 'image' || token.type === 'link') {
        token.href = fix(token.href, token.type === 'image');
      } else if (token.type === 'html') {
        token.text = token.text
          .replace(/<img\b[^>]*img\.shields\.io[^>]*>/gi, '')
          .replace(/(<(\w+)\b[^>]*?\s)(src|href)(\s*=\s*)(["'])(.*?)\5/gi,
            (all, before, tag, attr, eq, quote, url) => `${before}${attr}${eq}${quote}${fix(url, tag.toLowerCase() !== 'a')}${quote}`);
      }
    },
  });
  // The pages clean every document again with DOMPurify before showing it; this keeps anything
  // that runs code out of the page itself, and keeps the documents inside their <noscript>.
  return html
    .replace(/<(script|style|iframe|object|textarea|template)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|base|meta|link|form|noscript|template)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\b(href|src)(\s*=\s*)(["'])\s*javascript:[^"']*\3/gi, '$1$2$3#$3')
    // read without JavaScript, the pictures of every tab are on the page at once
    .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"');
}

// When a repository has no CHANGELOG.md, its release notes, as changelogFromGitHub in project.js
// makes them.
const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' });
function releaseNotes(p, releases) {
  // headings inside the notes move down two levels, below the version headings
  const demote = token => { if (token.type === 'heading') token.depth = Math.min(token.depth + 2, 6); };
  return `<p>From the <a href="https://github.com/${user}/${encodeURIComponent(p.repo)}/releases">releases on GitHub</a>.</p>` + releases.map(r => {
    let name = (r.name || '').trim();
    if (name.toLowerCase().startsWith(r.tag_name.toLowerCase())) name = name.slice(r.tag_name.length).replace(/^\s*[-–—:|]\s*/, '');
    return `<h2${r.prerelease ? ' data-prerelease' : ''}>${esc(r.tag_name)}${name ? ` — ${esc(name)}` : ''}</h2>`
      + `<p class="release__date">${dateFormat.format(new Date(r.published_at))}${r.prerelease ? ' · pre-release' : ''}</p>`
      + toHtml(r.body || '', p.repo, 'CHANGELOG.md', demote);
  }).join('');
}

// GitHub's heading anchors, numbered across a whole document, as anchorFor in project.js.
function anchorFor(text, used) {
  let id = text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
  const base = id;
  for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const plainText = html => html.replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (all, code) =>
  code[0] !== '#' ? ENTITIES[code.toLowerCase()] || all : String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : +code.slice(1)));

// Every heading of each tab with its anchor and place in the HTML, for the search index.
function headingsOf(parts) {
  const usedByFile = new Map();
  for (const part of parts) {
    if (!usedByFile.has(part.file)) usedByFile.set(part.file, new Set());
    const used = usedByFile.get(part.file);
    part.headings = [...part.html.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => {
      const text = plainText(m[2]).trim();
      return { level: +m[1], text, anchor: anchorFor(text, used), at: m.index };
    });
  }
}

/* ---------- the import string ---------- */

// Web addresses in the C# code that it calls: services (an API, a webhook, a data file), not the
// links it only shows in chat or in its settings window. A heuristic, said so on the page.
const SERVICE = /^https?:\/\/(?:[^/?#]*\.)?(?:api|id|app-api)\.|^https?:\/\/[^/?#]+\/(?:[^?#]*\/)?(?:api|v\d+(?:\.\d+)?|helix|oauth2?|graphql|sparql|webhooks)(?:[/?.#]|$)|\/api\.php|\.(?:json|txt|csv|tsv|xml)(?:[?#]|$)/i;
const ALWAYS = new Set(['raw.githubusercontent.com', 'ntfy.sh']);
const NOT_A_SERVICE = /^(localhost|absolute|[\d.]+)$|(^|\.)(example|evil)\.(com|org|net)$/i;
// the site a host belongs to: api.twitch.tv → twitch.tv, x.workers.dev stays whole
const siteOf = host => {
  const labels = host.split('.');
  const keep = /^(workers\.dev|github\.io|githubusercontent\.com|co\.uk)$/.test(labels.slice(-2).join('.')) ? 3 : 2;
  return labels.slice(-keep).join('.');
};

// What an import string adds; `text` is the file that holds it.
function importFacts(text) {
  const block = text.match(/```[^\n]*\n([\s\S]*?)```/);
  const bytes = Buffer.from(block ? block[1].replace(/\s+/g, '') : '', 'base64');
  if (bytes.subarray(0, 4).toString('latin1') !== 'SBAE') throw new Error('no import string in it');
  const sb = JSON.parse(zlib.gunzipSync(bytes.subarray(4)).toString('utf8'));
  const data = sb.data || {};
  const code = [];
  const walk = list => {
    for (const sub of list || []) {
      if (sub.byteCode) code.push(Buffer.from(sub.byteCode, 'base64').toString('utf8'));
      walk(sub.subActions);
    }
  };
  for (const action of data.actions || []) walk(action.subActions);
  const triggers = [...new Set((data.commands || []).flatMap(c => String(c.command || '').split(/\r?\n/)).map(t => t.trim()).filter(Boolean))];
  // each command once (SuTo has one per service it posts to), with who may use it
  const entries = [];
  for (const c of data.commands || []) {
    const list = String(c.command || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean);
    const twin = entries.find(e => e.triggers.join('\n') === list.join('\n'));
    if (twin) twin.names.push(String(c.name || ''));
    if (!list.length || twin) continue;
    const groups = (c.permittedGroups || []).map(g => ROLES[g.toLowerCase()] || g)
      .sort((a, b) => (Object.values(ROLES).indexOf(a) + 1 || 9) - (Object.values(ROLES).indexOf(b) + 1 || 9));
    const who = groups.length ? groups.join(', ') : (c.permittedUsers || []).length ? 'Chosen viewers' : 'Everyone';
    entries.push({ triggers: list, names: [String(c.name || '')], who });
  }
  const sites = new Set();
  let updateCheck = false;
  for (const source of code) {
    for (const [url] of source.matchAll(/https?:\/\/[^\s"'`\\)<>{}]+/gi)) {
      const host = url.replace(/^https?:\/\//i, '').split(/[/?#:]/)[0].toLowerCase().replace(/\.$/, '');
      if (!host.includes('.') || NOT_A_SERVICE.test(host)) continue;
      if (/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/releases/i.test(url)) { updateCheck = true; continue; }
      if (ALWAYS.has(host) || SERVICE.test(url)) sites.add(siteOf(host));
    }
  }
  const version = sb.meta && sb.meta.version ? String(sb.meta.version).replace(/^v+/i, '') : null;
  return {
    version,
    made: sb.exportedFrom || null,
    min: sb.minimumVersion || null,
    actions: (data.actions || []).length,
    code: code.length,
    commands: triggers.filter(t => t.startsWith('!')),
    words: triggers.filter(t => !t.startsWith('!')),
    timers: (data.timers || []).length,
    sites: [...sites].sort(),
    updateCheck,
    // for the commands page, not the project page
    entries,
  };
}

/* ---------- the commands page ---------- */

// Streamer.bot's groups as the commands page names them
const ROLES = { moderators: 'Mods', vips: 'VIPs', subscribers: 'Subs' };

// What the documents say about each command: the rows of their tables that start with it, like
//   | `!note <text>` | `!notiz`, `!postit` | everyone | Saves a note and answers with its number. |
// A row about one command wins over a row about several (`hit` / `stand`).
function commandNotes(parts, triggers) {
  const known = new Map(triggers.map(t => [t.toLowerCase(), t]));
  const notes = new Map();
  const ORDER = ['overview', 'setup', 'manual', 'faq'];
  const docs = parts.filter(part => part.text != null && part.id !== 'changelog')
    .sort((a, b) => (ORDER.indexOf(a.id) + 1 || 9) - (ORDER.indexOf(b.id) + 1 || 9));
  for (const part of docs) {
    marked.walkTokens(marked.lexer(part.text), token => {
      if (token.type !== 'table') return;
      for (const row of token.rows) {
        if (row.length < 2) continue;
        const last = row[row.length - 1].text.trim();
        // a value, not a sentence: `True`
        if (/^`[^`]*`$/.test(last)) continue;
        const text = plainText(marked.parseInline(last)).replace(/\s+/g, ' ').trim();
        if (text.split(' ').length < 3) continue;
        const named = [...row[0].text.matchAll(/`([^`]+)`/g)]
          .map(m => ({ usage: m[1].trim(), trigger: known.get(m[1].trim().split(/\s/)[0].toLowerCase()) }))
          .filter(x => x.trigger);
        for (const { usage, trigger } of named) {
          const old = notes.get(trigger);
          if (!old || old.shared > named.length) notes.set(trigger, { usage, text, shared: named.length });
        }
      }
    });
  }
  return notes;
}

// "[SMG] - Play Slots" → "Play Slots", "SB - PersonalStats" → "Personal Stats": the command's name
// in Streamer.bot, for a command the documents do not describe
// in Streamer.bot, for a command the documents do not describe. A command imported once per service
// ("Suggestion to Discord", "Suggestion to Stoat") gets what the names share: "Suggestion".
const fromName = names => {
  const words = names.map(name => name.replace(/^\[[^\]]*\]\s*-?\s*/, '').replace(/\s*\(mods?\)\s*$/i, '')
    .split(/\s+-\s+/).pop().split(/\s+/));
  const shared = [];
  for (let i = 0; i < words[0].length && words.every(w => w[i] === words[0][i]); i++) shared.push(words[0][i]);
  while (shared.length > 1 && /^(to|for|on|in)$/i.test(shared[shared.length - 1])) shared.pop();
  return (shared.length ? shared : words[0]).join(' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
};

// The commands of a project as the commands page lists them. Each shows the trigger its documents
// use most (OBS Notes: !note, not !notiz) and the others as aliases.
function commandList(p, facts, parts) {
  const all = facts.entries.flatMap(e => e.triggers);
  const notes = commandNotes(parts, all);
  const docs = parts.filter(part => part.text != null && part.id !== 'changelog').map(part => part.text).join('\n');
  const mentions = trigger => (docs.match(new RegExp(`(^|[^\\w!])${trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'gi')) || []).length;
  return facts.entries.map(e => {
    const counted = e.triggers.map((t, i) => ({ t, i, n: notes.has(t) ? 1e6 : mentions(t) }));
    const main = counted.sort((a, b) => b.n - a.n || a.i - b.i)[0].t;
    const note = notes.get(main) || e.triggers.map(t => notes.get(t)).find(Boolean);
    const named = fromName(e.names);
    const usage = note ? note.usage : named.toLowerCase().startsWith(main.toLowerCase()) ? named : main;
    // written as the documents write it: !hangman, not !Hangman
    const shown = usage.split(/\s/)[0].toLowerCase() === main.toLowerCase() ? usage.split(/\s/)[0] : main;
    return {
      trigger: shown,
      aliases: e.triggers.filter(t => t !== main),
      usage,
      text: note ? note.text : named.startsWith('!') ? '' : named,
      who: e.who,
      word: !main.startsWith('!'),
      start: /\bstart|\bplay\b/i.test(e.names[0]),
      minor: /stats|score|board|\btop\b|search|look ?up|skip|repeat|accept|decline|\bteam\b|fleet|tutorial|addict/i.test(`${e.names[0]} ${main}`),
    };
  });
}

// The commands a project puts on a new Twitch panel at first: up to three that everyone may use,
// the one that starts the game first, without the stats and replies.
function panelPicks(list) {
  const open = list.filter(c => c.who === 'Everyone' && !c.word);
  const picks = open.filter(c => !c.minor).sort((a, b) => b.start - a.start).slice(0, 3);
  return (picks.length ? picks : open.slice(0, 1)).map(c => c.trigger);
}

function commandsPage(groups) {
  const tile = p => p.logo
    ? `<span class="tile cmd-group__tile"><img src="../${esc(p.logo)}" alt="" width="40" height="40" loading="lazy"></span>`
    : `<span class="tile tile--mono cmd-group__tile" aria-hidden="true">${esc(p.mono || p.name.slice(0, 2))}</span>`;
  const row = (c, picks) => {
    const panel = c.who !== 'Everyone' ? '' : ` data-panel="${picks.includes(c.trigger) ? 'pick' : 'can'}"${c.start ? ' data-start' : ''}`;
    return `
            <li class="cmd" data-trigger="${esc(c.trigger)}"${panel}>
              <code class="cmd__usage">${esc(c.usage)}</code>
              <span class="cmd__text">${c.text ? esc(c.text) : '<span class="cmd__none">See the guide</span>'}</span>${c.aliases.length ? `
              <span class="cmd__alias">also ${c.aliases.map(esc).join(' ')}</span>` : ''}
              <span class="who${c.who === 'Everyone' ? '' : ' who--limited'}">${esc(c.who)}</span>
            </li>`;
  };
  return groups.map(({ p, list, picks }) => {
    const commands = list.filter(c => !c.word);
    const words = list.filter(c => c.word);
    return `
        <section class="cmd-group" id="${esc(p.page.split('/')[1])}" data-repo="${esc(p.repo)}" data-short="${esc(p.name.replace(/ Game$/, ''))}" aria-labelledby="cmd-${esc(p.repo)}">
          <header class="cmd-group__head">
            ${tile(p)}
            <h2 id="cmd-${esc(p.repo)}"><a href="../${esc(p.page)}">${esc(p.name)}</a></h2>
          </header>
          <ul class="cmd-group__rows">${commands.map(c => row(c, picks)).join('')}
          </ul>${words.length ? `
          <p class="cmd-group__sub">Typed in chat during a game</p>
          <ul class="cmd-group__rows">${words.map(c => row(c, picks)).join('')}
          </ul>` : ''}
        </section>`;
  }).join('');
}

/* ---------- the help page ---------- */

// _tools/problems.md: a "## " heading per problem, an optional line "For: …" under it, then the fix.
function problemsOf(markdown) {
  const used = new Set();
  return markdown.split(/^## /m).slice(1).map(block => {
    const [title, ...rest] = block.split(/\r?\n/);
    let body = rest.join('\n').trim();
    const forLine = body.match(/^For:\s*(.+)$/m);
    if (forLine && body.startsWith(forLine[0])) body = body.slice(forLine[0].length).trim();
    return { title: title.trim(), for: forLine ? forLine[1].trim() : '', anchor: anchorFor(title.trim(), used), html: marked.parse(body, { gfm: true }) };
  });
}

// "1.0.0-alpha.1" → "1.0"
const shortVersion = v => String(v || '').replace(/^v/i, '').replace(/-.*$/, '').replace(/(\.0)+$/, '').replace(/^(\d+)$/, '$1.0');

/* ---------- the pages ---------- */

(async () => {
const about = new Map();
try {
  for (const r of await getJSON(`https://api.github.com/users/${user}/repos?per_page=100`)) if (r.description) about.set(r.name.toLowerCase(), r.description);
} catch (e) {
  if (strict) throw e;
  console.warn(`About texts not loaded (${e.message}), using the taglines from projects.js.`);
}
const urls = ['', 'commands/', 'help/', 'privacy.html'];
const index = { projects: [], commands: [], sections: [] };
// for the commands page, the help page and the release feed
const commandGroups = [];
const compat = [];
const released = [];
for (const p of projects.filter(x => x.page)) {
  // the template's links lead two folders up
  if (!/^projects\/[a-z0-9-]+\/$/.test(p.page)) throw new Error(`page of ${p.repo} is not 'projects/<folder>/'`);
  for (const field of ['description', 'preview']) if (!p[field]) throw new Error(`${p.repo} has no ${field}`);
  p.tagline = about.get(p.repo.toLowerCase()) || p.tagline;
  // the latest stable release, as on the site; a pre-release only while there is none
  let releases = null;
  try {
    releases = (await getJSON(`https://api.github.com/repos/${user}/${p.repo}/releases?per_page=100`)).filter(r => !r.draft);
    const stable = releases.find(r => !r.prerelease);
    p.version = stable ? stable.tag_name : releases.length ? `${releases[0].tag_name} Pre-release` : null;
  } catch (e) {
    if (strict) throw e;
    console.warn(`Releases of ${p.repo} not loaded (${e.message}), using ${p.version || 'no version'} from projects.js.`);
  }
  // The documents project.js may load (the list there), as far as the repository has them, so the
  // page asks for no file that is missing. Unknown (no answer from GitHub): it asks for all of them.
  const importFile = p.importString || 'Import-String.md';
  const docList = DOCS.concat(p.moreDocs || []);
  let files = null;
  try {
    const wanted = new Set(docList.map(d => d.file).concat(importFile).map(f => f.toLowerCase()));
    const { tree } = await getJSON(`https://api.github.com/repos/${user}/${p.repo}/git/trees/main?recursive=1`);
    files = tree.filter(t => t.type === 'blob' && wanted.has(t.path.toLowerCase())).map(t => t.path);
  } catch (e) {
    if (strict) throw e;
    console.warn(`Files of ${p.repo} not loaded (${e.message}), its page will ask for every document.`);
  }
  const fileIn = file => files && files.find(f => f.toLowerCase() === file.toLowerCase());

  // the documents, cut into their tabs; without them the page loads them itself
  let parts = [];
  if (files) {
    try {
      const loaded = [];
      for (const doc of docList) {
        const file = fileIn(doc.file);
        if (file) loaded.push({ ...doc, file, text: await getText(rawUrl(p.repo, file)) });
        else if (doc.id === 'changelog' && releases && releases.length) loaded.push({ ...doc, html: releaseNotes(p, releases) });
      }
      const taken = new Set(loaded.map(doc => doc.id));
      parts = loaded.flatMap(doc => doc.text != null ? splitDoc(doc, doc.text, taken) : [doc]);
      for (const part of parts) if (part.html == null) part.html = toHtml(part.text, p.repo, part.file);
      headingsOf(parts);
    } catch (e) {
      if (strict) throw e;
      console.warn(`Documents of ${p.repo} not loaded (${e.message}), its page will load them itself.`);
      parts = [];
    }
  }
  let facts = null;
  if (fileIn(importFile)) {
    let text = null;
    try {
      text = await getText(rawUrl(p.repo, fileIn(importFile)));
    } catch (e) {
      if (strict) throw e;
      console.warn(`Import string of ${p.repo} not loaded (${e.message}).`);
    }
    // a broken import string is the project's to fix, not a reason to keep the old pages
    try {
      if (text != null) facts = importFacts(text);
    } catch (e) {
      console.warn(`Import string of ${p.repo} not read (${e.message}).`);
    }
  }
  // when the import string was last exported from Streamer.bot, for the compatibility table
  let exported = null;
  if (facts) {
    try {
      const [last] = await getJSON(`https://api.github.com/repos/${user}/${p.repo}/commits?path=${encodeURIComponent(fileIn(importFile))}&per_page=1`);
      exported = last ? last.commit.committer.date : null;
    } catch (e) {
      if (strict) throw e;
      console.warn(`Date of the import string of ${p.repo} not loaded (${e.message}).`);
    }
  }
  const stable = releases && releases.find(r => !r.prerelease);
  compat.push({ p, facts, exported, release: stable || (releases && releases[0]) || null });
  for (const r of (releases || []).slice(0, 10)) released.push({ p, r });
  if (facts && facts.entries.length) {
    const list = commandList(p, facts, parts);
    commandGroups.push({ p, list, picks: panelPicks(list) });
  }

  // the search index: the project, its commands and the headings of its documents
  const where = (part, heading) => `${part.id === 'overview' ? p.page : `${p.page}?tab=${part.id}`}${heading ? `#${encodeURIComponent(heading.anchor)}` : ''}`;
  const n = index.projects.push({
    name: p.name, page: p.page, text: p.tagline,
    keys: [p.description, ...(p.platforms || []), ...(p.tags || []), p.repo].join(' '),
  }) - 1;
  // without the emoji some headings start with
  const bare = text => text.replace(/^[^\p{L}\p{N}]+/u, '');
  for (const part of parts) {
    // a changelog is all version numbers
    if (part.id === 'changelog') continue;
    for (const h of part.headings) {
      // a document's title at its top: the project's name, or "TwitchSentry — Manual"
      if (h.level > 3 || h.level === 1 && h === part.headings[0]) continue;
      index.sections.push({ title: bare(h.text), p: n, href: where(part, h), where: part.label });
    }
  }
  // each command leads to the first place in the documents that explains it
  const ORDER = ['setup', 'manual', 'overview', 'faq'];
  const search = parts.filter(part => part.id !== 'changelog')
    .sort((a, b) => (ORDER.indexOf(a.id) + 1 || 9) - (ORDER.indexOf(b.id) + 1 || 9));
  for (const command of facts ? facts.commands : []) {
    const pattern = new RegExp(`(^|[^\\w!])${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i');
    let href = p.page;
    let place = null;
    for (const part of search) {
      const found = pattern.exec(part.html);
      if (!found) continue;
      const heading = part.headings.filter(h => h.at < found.index).pop();
      href = where(part, heading);
      // "Setup guide › Commands", or just "Overview" for the heading "📖 Overview" in it
      const title = heading && bare(heading.text);
      place = title && title.toLowerCase() !== part.label.toLowerCase() ? `${part.label} › ${title}` : part.label;
      break;
    }
    index.commands.push({ command, p: n, href, where: place });
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
      </div>
    </section>`;
  // Read by project.js; with JavaScript off, the documents show as they are, one after the other.
  const docs = parts.length
    ? parts.map(part => `
      <section class="md" data-doc="${esc(part.id)}" data-label="${esc(part.label)}" data-file="${esc(part.file)}">
        <h2 class="doc-label">${esc(part.label)}</h2>
        <div class="doc-body">${part.html}</div>
      </section>`).join('')
    : `\n      <p class="doc-status">The documents load with JavaScript. You can also read them on <a href="https://github.com/${user}/${esc(p.repo)}">GitHub</a>.</p>`;
  // `<` written as \u003c, so nothing in it can end the script element
  const data = facts ? `\n  <script type="application/json" id="import-facts">${JSON.stringify({ ...facts, entries: undefined }).replace(/</g, '\\u003c')}</script>` : '';
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
    if (key === 'docs') return docs;
    if (key === 'data') return data;
    if (key === 'labels') return labels;
    if (key === 'files') return files ? ` data-files="${esc(files.join('|'))}"` : '';
    if (values[key] == null) throw new Error(`nothing for {{${key}}} on the page of ${p.repo}`);
    return esc(values[key]);
  });
  fs.mkdirSync(p.page, { recursive: true });
  fs.writeFileSync(`${p.page}index.html`, html);
  urls.push(p.page);
  console.log(`${p.repo}: ${parts.length} tabs, ${facts ? `${facts.commands.length} commands, ${facts.sites.length} services` : 'no import string'}`);
}
// a page of its own, from its template in _tools/; `{{name}}` is filled from `values`
const writePage = (folder, values) => {
  const html = fs.readFileSync(`_tools/${folder}-page.html`, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (values[key] == null) throw new Error(`nothing for {{${key}}} on the ${folder} page`);
    return values[key];
  });
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(`${folder}/index.html`, html);
};

// the commands page, its project tick boxes and panel built by assets/js/commands.js; the chat games
// first, as they are what a panel tells viewers about
const SECTIONS = ['games', 'tools', 'more'];
commandGroups.sort((a, b) => (SECTIONS.indexOf(a.p.section) + 1 || 9) - (SECTIONS.indexOf(b.p.section) + 1 || 9));
writePage('commands', { groups: commandsPage(commandGroups), count: String(commandGroups.reduce((n, g) => n + g.list.length, 0)) });
index.sections.push({ title: 'Every chat command, and a Twitch panel for them', p: -1, href: 'commands/', where: 'Commands' });

// the help page: the common problems from _tools/problems.md, then the compatibility table
const problems = problemsOf(fs.readFileSync('_tools/problems.md', 'utf8'));
const shortDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
const day = date => date ? `<time datetime="${esc(date.slice(0, 10))}">${shortDate.format(new Date(date))}</time>` : '–';
const compatRows = compat.map(({ p, facts, exported, release }) => {
  const name = `<th scope="row"><a href="../${esc(p.page)}">${esc(p.name)}</a></th>`;
  const version = release ? `<td>${esc(release.tag_name)}<small>${day(release.published_at)}</small></td>` : '<td>–</td>';
  if (!facts) return `
            <tr>${name}${version}<td colspan="2" class="compat__none">Runs on its own, outside Streamer.bot</td></tr>`;
  return `
            <tr>${name}${version}<td>${esc(facts.made || '–')}<small>${day(exported)}</small></td><td>${facts.min ? `${esc(shortVersion(facts.min))} or newer` : '–'}</td></tr>`;
}).join('');
writePage('help', {
  problems: problems.map(x => `
          <details class="problem" id="${esc(x.anchor)}">
            <summary><span class="problem__title">${esc(x.title)}</span>${x.for ? `<span class="problem__for">${esc(x.for)}</span>` : ''}</summary>
            <div class="problem__body md">${x.html}</div>
          </details>`).join(''),
  toc: problems.map(x => `<li><a href="#${esc(x.anchor)}">${esc(x.title)}</a></li>`).join(''),
  compat: compatRows,
  faqs: compat.map(({ p }) => `
            <li><a href="../${esc(p.page)}?tab=faq">${esc(p.name)}</a></li>`).join(''),
});
for (const x of problems) index.sections.push({ title: x.title, p: -1, href: `help/#${encodeURIComponent(x.anchor)}`, where: 'Help › Common problems' });
index.sections.push({ title: 'Which Streamer.bot version each project needs', p: -1, href: 'help/#compatibility', where: 'Help › Compatibility' });

// the release feed: the latest releases of every project, newest first
const recent = released.sort((a, b) => b.r.published_at.localeCompare(a.r.published_at)).slice(0, 30);
// characters XML does not allow, which a release note may carry
const xml = text => esc(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>aaskjer · new releases</title>
  <subtitle>New versions of aaskjer's Streamer.bot extensions.</subtitle>
  <link rel="self" type="application/atom+xml" href="https://aaskjer.github.io/feed.xml"/>
  <link rel="alternate" type="text/html" href="https://aaskjer.github.io/"/>
  <id>https://aaskjer.github.io/feed.xml</id>
  <updated>${recent.length ? recent[0].r.published_at : '2026-01-01T00:00:00Z'}</updated>
  <author><name>aaskjer</name><uri>https://github.com/${user}</uri></author>
  <icon>https://aaskjer.github.io/assets/img/avatar.png</icon>
${recent.map(({ p, r }) => {
    let name = (r.name || '').trim();
    if (name.toLowerCase().startsWith(r.tag_name.toLowerCase())) name = name.slice(r.tag_name.length).replace(/^\s*[-–—:|]\s*/, '');
    const title = `${p.name} ${r.tag_name}${name ? `: ${name}` : ''}${r.prerelease ? ' (pre-release)' : ''}`;
    const body = toHtml(r.body || '', p.repo, 'CHANGELOG.md')
      + `<p><a href="${esc(r.html_url)}">Download ${esc(r.tag_name)}</a> · <a href="https://aaskjer.github.io/${esc(p.page)}">${esc(p.name)} on aaskjer.github.io</a></p>`;
    return `  <entry>
    <title>${xml(title)}</title>
    <link rel="alternate" type="text/html" href="${esc(r.html_url)}"/>
    <id>${esc(r.html_url)}</id>
    <published>${r.published_at}</published>
    <updated>${r.published_at}</updated>
    <category term="${esc(p.repo)}" label="${esc(p.name)}"/>
    <content type="html">${xml(body)}</content>
  </entry>`;
  }).join('\n')}
</feed>
`;
fs.writeFileSync('feed.xml', feed);

fs.writeFileSync('assets/search.json', JSON.stringify(index) + '\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>https://aaskjer.github.io/${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync('sitemap.xml', sitemap);
console.log(`Wrote ${commandGroups.length} projects to the commands page, ${problems.length} problems to the help page, ${recent.length} releases to feed.xml, ${urls.length - 4} project pages, assets/search.json and sitemap.xml.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
