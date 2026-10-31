/*
 * A project's own page. The header comes from projects.js; the documents below it
 * (README, setup guide, manual, FAQ, changelog) are in the page already, as HTML that
 * _tools/update-pages.js made from the project's GitHub repository, and so is what its
 * import string adds to Streamer.bot. A page that has not been rebuilt yet loads the
 * documents from GitHub and turns them into HTML here. A game with a `playground` in projects.js
 * gets a "Try it" tab, which loads assets/js/playground.js and the game's rules.
 */
(() => {
  'use strict';

  const { user, stats, projects } = window.SITE;
  const repo = document.body.dataset.repo;
  const p = projects.find(x => x.repo === repo);
  // the pages sit in projects/<folder>/
  const ROOT = '../../';
  const API = 'https://api.github.com';
  const RAW = `https://raw.githubusercontent.com/${user}/${repo}/main/`;
  const REPO_URL = `https://github.com/${user}/${encodeURIComponent(repo)}`;
  // the start page's answers from the GitHub API, used for as long as the start page uses them
  const CACHE_KEY = 'github-live-v5';
  const CACHE_TTL = 60 * 60 * 1000;
  // the same fingerprint of projects.js as on the start page: answers kept before a change to it are not used
  const SITE_STAMP = (text => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
    return hash.toString(36);
  })(JSON.stringify(window.SITE));
  const DOCS = [
    { id: 'overview', label: 'Overview', file: 'README.md' },
    { id: 'setup', label: 'Setup guide', file: 'Setup-Guide.md' },
    { id: 'manual', label: 'Manual', file: 'Manual.md' },
    { id: 'faq', label: 'FAQ', file: 'FAQ.md' },
    { id: 'changelog', label: 'Changelog', file: 'CHANGELOG.md' },
    ...(p && p.moreDocs || []),
  ];
  const IMPORT_FILE = p && p.importString || 'Import-String.md';
  // The documents the repository has, as _tools/update-pages.js found them (lower case → real name),
  // so no request goes to a file that is not there. A page not rebuilt yet has no list and asks for all.
  const FILES = document.body.dataset.files != null
    ? new Map(document.body.dataset.files.split('|').filter(Boolean).map(f => [f.toLowerCase(), f]))
    : null;
  // the file's name in the repository, or null when it has no such file
  const fileIn = file => FILES ? FILES.get(file.toLowerCase()) || null : file;

  // The documents as update-pages.js wrote them: one [data-doc] per tab. With JavaScript on, a
  // <noscript> holds its HTML as plain text, so nothing in it loads until a tab shows it.
  const PRERENDERED = (() => {
    const box = document.getElementById('docs');
    if (!box) return [];
    const tpl = document.createElement('template');
    tpl.innerHTML = box.textContent;
    return [...tpl.content.querySelectorAll('[data-doc]')].map(el => ({
      id: el.dataset.doc, label: el.dataset.label, file: el.dataset.file, html: el.querySelector('.doc-body').innerHTML,
    }));
  })();
  // What the import string adds (commands, actions, web services), read from it by update-pages.js.
  const FACTS = (() => {
    try { return JSON.parse(document.getElementById('import-facts').textContent); } catch (e) { return null; }
  })();

  const $ = sel => document.querySelector(sel);
  const numberFormat = new Intl.NumberFormat('en');
  const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'long' });
  const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = name => `<svg class="i" aria-hidden="true"><use href="${ROOT}assets/img/icons.svg#i-${name}"/></svg>`;
  const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (!p) {
    $('#main').innerHTML = `<p class="wrap doc-status">This project is not on the list. <a href="${ROOT}">Back to all projects</a></p>`;
    return;
  }

  function timeAgo(iso) {
    const seconds = (new Date(iso) - Date.now()) / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
    }
    return 'just now';
  }

  /* ---------- header ---------- */

  const STATUS = {
    dev: { label: 'In development', note: 'Actively worked on: new features and changes are still coming.' },
    // a project is either in development or has no label: finished, apart from fixes
    done: { label: 'Done', note: 'Finished: no more updates planned, apart from fixes if something breaks.', hidden: true },
  };

  // Same "New" badge as on the start page: a release since the visitor's previous visit.
  const previousVisit = (() => {
    try {
      const now = Date.now();
      const visit = JSON.parse(localStorage.getItem('visit')) || {};
      if (!visit.current || now - visit.current > 30 * 60 * 1000) visit.previous = visit.current || null;
      visit.current = now;
      localStorage.setItem('visit', JSON.stringify(visit));
      return visit.previous;
    } catch (e) { return null; }
  })();

  function badges() {
    const status = STATUS[p.status];
    const label = status && !status.hidden ? `<span class="badge badge--${p.status}" title="${esc(status.note)}">${status.label}</span>` : '';
    // a pre-release newer than the latest stable version, e.g. "v2.0.0 Pre-release"
    const pre = p.pre
      ? `<span class="badge badge--pre" title="${esc(p.pre.version)}, out ${esc(timeAgo(p.pre.released))}: a test version of what comes next, not finished yet">${esc(p.pre.version.replace(/-.*/, ''))} Pre-release</span>` : '';
    // since the last visit: "New" when the first release came out, "Updated" for a later one (a pre-release too)
    const latest = p.pre ? p.pre.released : p.released;
    let fresh = '';
    if (latest && previousVisit && new Date(latest) > previousVisit) {
      const what = p.pre ? `Pre-release ${p.pre.version}` : p.version || 'A new version';
      fresh = p.firstReleased && new Date(p.firstReleased) > previousVisit
        ? `<span class="badge badge--new" title="First released ${esc(timeAgo(p.firstReleased))}, since your last visit">New</span>`
        : `<span class="badge badge--updated" title="${esc(what)} released ${esc(timeAgo(latest))}, since your last visit">Updated</span>`;
    }
    return `<span class="badges"><span class="badge"${p.version ? '' : ' hidden'}>${esc(p.version || '')}</span>${pre}${fresh}${label}</span>`;
  }

  function metaRow() {
    const items = [`<span class="meta" title="GitHub stars">${icon('star')}${numberFormat.format(p.stars || 0)}<span class="sr-only"> stars</span></span>`];
    if (p.downloads != null) items.push(`<span class="meta" title="Downloads">${icon('download')}${numberFormat.format(p.downloads)}<span class="sr-only"> downloads</span></span>`);
    if (p.updated) items.push(`<span class="meta" title="Last update">${icon('clock')}<span class="sr-only">updated </span>${timeAgo(p.updated)}</span>`);
    return items.join('');
  }

  function chips() {
    const items = (p.platforms || []).map(name => `<li class="chip chip--${slug(name)}">${esc(name)}</li>`);
    for (const tag of p.tags || []) items.push(`<li class="chip chip--tag">${esc(tag)}</li>`);
    return items.length ? `<ul class="chips" aria-label="Works with">${items.join('')}</ul>` : '';
  }

  function header() {
    const logo = p.logo
      ? `<div class="tile"><img src="${ROOT + esc(p.logo)}" alt="" width="84" height="84"></div>`
      : `<div class="tile tile--mono"><span class="grad">${esc(p.mono || p.name.slice(0, 2))}</span></div>`;
    const picture = p.scene || p.screenshot;
    const full = p.scene || p.screenshotFull || p.screenshot;
    return `
      <section class="project-hero">
        <div class="wrap">
          <a class="back-link" href="${ROOT}#${esc(p.section || 'tools')}">${icon('back')}All projects</a>
          <div class="project-hero__grid">
            <div>
              <div class="card__head">
                ${logo}
                <div class="card__heading">
                  <h1>${esc(p.name || p.repo)}</h1>
                  ${badges()}
                </div>
              </div>
              <p class="project-hero__lead">${esc(p.tagline || '')}</p>
              ${chips()}
              <div class="meta-row" id="meta">${metaRow()}</div>
              <div class="project-hero__links">
                <a href="${REPO_URL}" data-track="github">${icon('github')}Source on GitHub</a>
                <a href="${REPO_URL}/issues/new/choose" data-track="report">${icon('flag')}Report a problem</a>${p.playground ? `
                <a href="?tab=try" data-tab="try" data-track="playground-link">${icon('play')}Try it in your browser</a>` : ''}
              </div>
            </div>
            ${picture ? `
            <button class="card__shot project-shot" type="button" data-track="scene" data-full="${ROOT + esc(full)}"
                    data-caption="${esc(p.name)}${p.scene ? ' · example scene with sample chat' : ''}" aria-label="Show a larger picture of ${esc(p.name)}">
              <img src="${ROOT + esc(picture.replace(/(\.\w+)$/, p.scene ? '-thumb$1' : '$1'))}" alt="${esc(p.sceneAlt || p.name)}" width="960" height="540">
              <span class="zoom">${icon('expand')}</span>
            </button>` : ''}
          </div>
        </div>
      </section>
      ${install()}
      <div class="tabs-bar">
        <div class="wrap"><nav class="tabs" role="tablist" aria-label="Documents" id="tabs"></nav></div>
      </div>
      <div class="wrap project-doc">
        <article class="md" id="doc" role="tabpanel"><p class="doc-status">Loading the documents from GitHub…</p></article>
        <aside class="toc" id="toc" aria-label="On this page"></aside>
      </div>`;
  }

  /* ---------- install ---------- */

  const STREAMING = ['Twitch', 'YouTube', 'Kick', 'Owncast', 'Rumble', 'Picarto', 'TikTok'];
  const SENDS_TO = ['Discord', 'Stoat', 'GameVox', 'ntfy', 'Windows'];
  const orList = list => list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}`;
  const plural = (n, word) => `${numberFormat.format(n)} ${word}${n === 1 ? '' : 's'}`;
  // "1.0.0-alpha.1" → "1.0": the release line, without a test build's suffix
  const versionLine = v => v.replace(/-.*/, '').replace(/^(\d+\.\d+)(\.0)+$/, '$1');
  // The tab of the project's guide: the setup guide, or a manual like TwitchSentry's.
  const GUIDE_TABS = { 'setup-guide.md': 'setup', 'manual.md': 'manual' };
  // On a phone the box would push the documents a screen down, so its lists fold away there.
  const FOLD = window.matchMedia('(max-width: 640px)').matches;
  const group = (title, body) => FOLD
    ? `<details class="install__group"><summary><h3>${title}</h3></summary>${body}</details>`
    : `<div class="install__group"><h3>${title}</h3>${body}</div>`;

  function needs() {
    const rows = [];
    if (FACTS) rows.push(['Streamer.bot', FACTS.min ? `${versionLine(FACTS.min)} or newer${FACTS.made ? `, made with ${FACTS.made}` : ''}` : '']);
    const streaming = (p.platforms || []).filter(name => STREAMING.includes(name));
    if (streaming.length) rows.push(['Platform', `${orList(streaming)}, connected in Streamer.bot`]);
    if ((p.tags || []).includes('OBS overlay')) rows.push(['OBS Studio', 'for the overlay, as a browser source']);
    const sends = (p.tags || []).filter(name => SENDS_TO.includes(name));
    if (FACTS && sends.length) rows.push(['Sends to', orList(sends)]);
    if (!FACTS && (p.platforms || []).includes('Windows')) rows.push(['Windows', (p.tags || []).includes('PowerShell') ? 'with PowerShell' : '']);
    return rows.map(([name, value]) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('');
  }

  function adds() {
    if (!FACTS) return '';
    const items = [];
    const code = list => list.map(c => `<code>${esc(c)}</code>`).join(' ');
    if (FACTS.commands.length) {
      const first = FACTS.commands.slice(0, 8);
      const rest = FACTS.commands.slice(first.length);
      items.push(['terminal', `<b>${plural(FACTS.commands.length, 'chat command')}</b> <span class="install__list">${code(first)}${rest.length
        ? ` <details class="install__more"><summary>and ${rest.length} more</summary>${code(rest)}</details>` : ''}</span>`
        + (FACTS.words.length ? `<span class="install__words">In the game: ${esc(FACTS.words.join(', '))}</span>` : '')]);
    } else if (FACTS.words.length) {
      items.push(['terminal', `<b>Chat words</b> <span class="install__list">${code(FACTS.words)}</span>`]);
    }
    const withCode = FACTS.code === FACTS.actions ? (FACTS.code === 1 ? 'with C# code' : 'each with C# code') : `${numberFormat.format(FACTS.code)} with C# code`;
    items.push(['code', `<b>${plural(FACTS.actions, 'action')}</b> <span>${withCode}, which you can read in Streamer.bot</span>`]);
    if (FACTS.timers) items.push(['clock', `<b>${plural(FACTS.timers, 'timer')}</b>`]);
    const online = FACTS.sites.length
      ? `${esc(FACTS.sites.join(', '))}${FACTS.updateCheck ? ', and GitHub to look for updates' : ''}`
      : FACTS.updateCheck ? 'Only GitHub, to look for updates' : 'None';
    items.push(['globe', `<b>Online services</b> <span>${online}</span>`]);
    return group('What this import adds', `
            <ul class="install__adds">${items.map(([name, html]) => `<li>${icon(name)}<div>${html}</div></li>`).join('')}</ul>
            <p class="install__note">Read from the import string${FACTS.version ? ` (v${esc(FACTS.version)})` : ''}. The services are the web addresses its C# code calls, found automatically.</p>`);
  }

  // The version the copy button gives, where it is not the one the download button gives.
  function importNote() {
    if (!FACTS || !FACTS.version || !p.version || FACTS.version === p.version.replace(/^v/i, '')) return '';
    return `The import string is v${esc(FACTS.version)}, the download ${esc(p.version)}.`;
  }

  function install() {
    const guide = p.guide && GUIDE_TABS[p.guide.href.toLowerCase()];
    const guideLink = guide && fileIn(p.guide.href)
      ? `<a href="?tab=${guide}" data-tab="${guide}" data-track="install-guide">${esc(p.guide.label.toLowerCase())}</a>` : 'setup guide';
    const download = p.download === false ? ''
      : `<a class="btn btn--primary" href="${esc(p.download || `${REPO_URL}/releases/latest`)}" data-track="download">${icon('download')}${esc(p.downloadLabel || 'Download')}</a>`;
    const steps = FACTS || fileIn(IMPORT_FILE)
      ? ['Download the file or copy the import string.', 'In Streamer.bot click Import, then drop in the file or paste the string.', `Follow the ${guideLink}.`]
      : ['Download it.', `Follow the ${guideLink}.`];
    return `
      <section class="wrap install" aria-labelledby="install-title">
        <div class="install__box">
          <div class="install__start">
            <h2 class="install__title" id="install-title">Install</h2>
            <div class="install__actions">
              ${download}
              <button class="btn btn--ghost" type="button" data-copy-import data-track="import-string" hidden>${icon('copy')}Copy import string</button>
            </div>
            <p class="install__note" id="import-note">${importNote()}</p>
            <ol class="install__steps">${steps.map(step => `<li>${step}</li>`).join('')}</ol>
          </div>
          ${group('What you need', `<dl class="install__needs">${needs()}</dl>`)}${adds()}
        </div>
      </section>`;
  }

  /* ---------- live numbers ---------- */

  // Asked for once, used by the numbers in the header and by the Changelog tab.
  let releasesRequest = null;
  const releases = () => releasesRequest || (releasesRequest =
    fetch(`${API}/repos/${user}/${repo}/releases?per_page=100`).then(res => res.ok ? res.json() : Promise.reject(res.status)));

  async function refreshNumbers() {
    let live = null;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && cached.site === SITE_STAMP && Date.now() - cached.time < CACHE_TTL) live = cached.live.find(l => l.name.toLowerCase() === repo.toLowerCase());
    } catch (e) { /* no cache */ }
    if (!live) {
      try {
        const [r, list] = await Promise.all([
          fetch(`${API}/repos/${user}/${repo}`).then(res => res.ok ? res.json() : Promise.reject(res.status)),
          releases().catch(() => null),
        ]);
        const stable = list && list.find(rel => !rel.draft && !rel.prerelease);
        const newest = list && list.find(rel => !rel.draft);
        const published = list ? list.filter(rel => !rel.draft).map(rel => rel.published_at).sort() : [];
        live = {
          description: r.description,
          stars: r.stargazers_count,
          pushed: r.pushed_at,
          version: stable ? stable.tag_name : null,
          released: stable ? stable.published_at : null,
          firstReleased: published[0] || null,
          pre: newest && newest.prerelease ? { version: newest.tag_name, released: newest.published_at } : null,
          downloads: list && list.reduce((sum, rel) => sum + rel.assets.reduce((n, a) => n + a.download_count, 0), 0),
        };
      } catch (e) { return; }
    }
    if (live.description) {
      p.tagline = live.description;
      $('.project-hero__lead').textContent = p.tagline;
    }
    p.stars = live.stars;
    p.updated = live.pushed;
    if (live.downloads != null) p.downloads = live.downloads;
    if (live.version) p.version = live.version;
    p.released = live.released;
    p.firstReleased = live.firstReleased;
    p.pre = live.pre;
    // only pre-releases so far: GitHub's "latest" link would find nothing
    const button = $('.install [data-track="download"]');
    if (live.pre && !live.version && !p.download && button) button.href = `${REPO_URL}/releases/tag/${encodeURIComponent(live.pre.version)}`;
    $('#meta').innerHTML = metaRow();
    $('.project-hero .badges').outerHTML = badges();
    $('#import-note').innerHTML = importNote();
  }

  /* ---------- import string ---------- */

  async function importString() {
    const text = await fetch(RAW + (fileIn(IMPORT_FILE) || IMPORT_FILE)).then(res => res.ok ? res.text() : Promise.reject(res.status));
    const block = text.match(/```[^\n]*\n([\s\S]*?)```/);
    const value = block ? block[1].replace(/\s+/g, '') : '';
    if (!value.startsWith('U0JBR')) throw new Error('no import string');
    return value;
  }

  function toast(message) {
    let box = $('.toast');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toast';
      box.setAttribute('role', 'status');
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.classList.add('is-on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => box.classList.remove('is-on'), 4000);
  }

  async function setupImportString() {
    const button = $('[data-copy-import]');
    const file = fileIn(IMPORT_FILE);
    if (!file) return;
    if (!FILES) {
      const head = await fetch(RAW + file, { method: 'HEAD' }).catch(() => null);
      if (!head || !head.ok) return;
    }
    button.hidden = false;
    button.addEventListener('click', async () => {
      try {
        // Safari only allows the clipboard during the click, so the text is handed over as a promise.
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
          const blob = importString().then(text => new Blob([text], { type: 'text/plain' }));
          await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
        } else {
          await navigator.clipboard.writeText(await importString());
        }
        toast('Import string copied. In Streamer.bot click Import and paste it.');
      } catch (e) {
        toast('Copying did not work here. The import string is in the repository on GitHub.');
      }
    });
  }

  /* ---------- documents ---------- */

  // every tab: { id, label, file } and its markdown `text` or ready `html`
  let available = [];
  // A line `<!-- tab: Setup -->` in a document starts the tab "Setup" there; GitHub does not show
  // the line. Sections with the same name share a tab, and the document's own name (Overview for
  // the README) leads back to its first one.
  const TAB_MARKER = /^<!--[ \t]*tab:[ \t]*(.+?)[ \t]*-->[ \t]*\r?$/gim;

  function dirOf(file) {
    return file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
  }

  // GitHub's heading anchors: lower case, punctuation and emoji dropped, each space a hyphen.
  function anchorFor(text, used) {
    let id = text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const base = id;
    for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  }

  // `path` is relative to the folder of the document it appears in, so ../FAQ.md works too.
  function docForPath(path, from) {
    const file = decodeURIComponent(new URL(path || 'README.md', `https://repo/${dirOf(from)}`).pathname.slice(1)).toLowerCase();
    return available.find(d => d.file.toLowerCase() === file);
  }

  // The tab of a split document that holds the heading `anchor`; `doc` itself otherwise.
  function partWith(doc, anchor) {
    if (!anchor || !doc.anchors) return doc;
    try { anchor = decodeURIComponent(anchor); } catch (e) { /* keep it as it is */ }
    return available.find(d => d.file === doc.file && d.anchors && d.anchors.has(anchor)) || doc;
  }

  function headingsOf(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = window.DOMPurify.sanitize(html);
    return [...tpl.content.querySelectorAll('h1, h2, h3, h4')].map(h => h.textContent);
  }

  // Cuts a document at its tab markers (update-pages.js does the same for the pages it writes).
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

  // The tabs of a document cut in several know their heading anchors, numbered across the whole
  // document as on GitHub, so links to them open the right tab.
  function withAnchors(parts) {
    for (const file of new Set(parts.map(part => part.file))) {
      const same = parts.filter(part => part.file === file);
      if (same.length < 2) continue;
      const used = new Set();
      for (const part of same) {
        part.usedBefore = new Set(used);
        part.anchors = new Set(headingsOf(part.html).map(h => anchorFor(h, used)));
      }
    }
    return parts;
  }

  function removeIfEmpty(el) {
    while (el && el !== null && el.parentNode && !el.textContent.trim() && !el.querySelector('img, table, pre, hr')) {
      const parent = el.parentNode;
      el.remove();
      el = parent.nodeType === 1 && parent.tagName !== 'TEMPLATE' ? parent : null;
    }
  }

  // Without a CHANGELOG.md the Changelog tab shows the release notes from GitHub, and for a
  // project without releases its commit history.
  async function changelogFromGitHub() {
    const fallback = `<p>The changelog could not be loaded right now. See the <a href="${REPO_URL}/releases">releases on GitHub</a>.</p>`;
    const list = await releases().catch(() => null);
    if (!list) return fallback;
    const published = list.filter(r => !r.draft);
    if (published.length) {
      // headings inside the notes move down two levels, below the version headings
      const demote = token => { if (token.type === 'heading') token.depth = Math.min(token.depth + 2, 6); };
      return `<p>From the <a href="${REPO_URL}/releases">releases on GitHub</a>.</p>` + published.map(r => {
        let name = (r.name || '').trim();
        if (name.toLowerCase().startsWith(r.tag_name.toLowerCase())) name = name.slice(r.tag_name.length).replace(/^\s*[-–—:|]\s*/, '');
        return `<h2${r.prerelease ? ' data-prerelease' : ''}>${esc(r.tag_name)}${name ? ` — ${esc(name)}` : ''}</h2>`
          + `<p class="release__date">${dateFormat.format(new Date(r.published_at))}${r.prerelease ? ' · pre-release' : ''}</p>`
          + window.marked.parse(r.body || '', { gfm: true, walkTokens: demote });
      }).join('');
    }
    const commits = await fetch(`${API}/repos/${user}/${repo}/commits?per_page=100`).then(res => res.ok ? res.json() : null).catch(() => null);
    if (!commits) return fallback;
    const days = new Map();
    for (const c of commits) {
      if (c.parents.length > 1) continue; // a merge only repeats the commits it brings in
      const day = dateFormat.format(new Date(c.commit.author.date));
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(`<li><a href="${esc(c.html_url)}">${esc(c.commit.message.split('\n')[0])}</a></li>`);
    }
    return `<p>${esc(p.name)} has no releases, so this is its <a href="${REPO_URL}/commits/main">commit history</a> on GitHub.</p>`
      + [...days].map(([day, items]) => `<h2>${day}</h2><ul>${items.join('')}</ul>`).join('');
  }

  // Changelogs: every version folds away under its heading, except the newest one
  // (and anything unreleased or pre-release above it).
  function foldVersions(root) {
    let latest = true;
    for (const h of [...root.children].filter(el => el.tagName === 'H2')) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      details.className = 'release';
      h.replaceWith(details);
      summary.appendChild(h);
      details.appendChild(summary);
      while (details.nextSibling && details.nextSibling.nodeName !== 'H2') details.appendChild(details.nextSibling);
      while (details.lastElementChild && details.lastElementChild.tagName === 'HR') details.lastElementChild.remove();
      if (!latest) continue;
      details.open = true;
      // GitHub's pre-release tick for release notes, the usual names in a CHANGELOG.md
      if (h.hasAttribute('data-prerelease') || /unreleased|-(alpha|beta|rc|pre)\b/i.test(h.textContent)) continue;
      summary.insertAdjacentHTML('beforeend', '<span class="badge">Latest</span>');
      latest = false;
    }
  }

  // Opens the folded version a link or address points into.
  function reveal(target) {
    const details = target.closest('details');
    if (details) details.open = true;
  }

  function render(doc) {
    const html = window.DOMPurify.sanitize(doc.html, { ADD_ATTR: ['align'] });
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const root = tpl.content;
    const base = RAW + dirOf(doc.file);

    // Pictures: badges go (the header already shows version and downloads), GitHub
    // "blob" links become direct file links, relative paths point into the repository.
    let firstHeadingSeen = false;
    for (const el of root.querySelectorAll('h1, h2, img')) {
      if (el.tagName !== 'IMG') { firstHeadingSeen = true; continue; }
      let src = el.getAttribute('src') || '';
      if (/^https?:\/\/img\.shields\.io\//i.test(src)) {
        const parent = el.parentNode;
        el.remove();
        removeIfEmpty(parent);
        continue;
      }
      const blob = src.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/([^?#]+)/i);
      if (blob) src = `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}/${blob[4]}`;
      else if (!/^(https?:|data:)/i.test(src)) src = new URL(src, base).href;
      // the big logo at the top of a README repeats the header
      if (doc.id === 'overview' && !firstHeadingSeen && src.startsWith('https://raw.githubusercontent.com/')) {
        const parent = el.parentNode;
        el.remove();
        removeIfEmpty(parent);
        continue;
      }
      el.setAttribute('src', src);
      el.setAttribute('loading', 'lazy');
      el.setAttribute('decoding', 'async');
    }

    // Links: other documents of this page open as tabs, other repository files on GitHub.
    for (const a of root.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (href.startsWith('#')) {
        // a heading in another tab of the same document
        const part = partWith(doc, href.slice(1));
        if (part !== doc) {
          a.setAttribute('href', `?tab=${part.id}${href}`);
          a.dataset.tab = part.id;
          a.dataset.anchor = href.slice(1);
        }
        continue;
      }
      let path = null;
      let from = doc.file;
      let hash = '';
      // links to a file of this repository on GitHub (an empty path after /tree/main is the README)
      const own = href.match(new RegExp(`^https://github\\.com/${user}/${repo}/(?:blob|tree)/[^/]+/?([^#?]*)(#.*)?$`, 'i'));
      if (own) { path = own[1]; hash = own[2] || ''; from = ''; }
      else if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) { [path, hash = ''] = href.split(/(?=#)/); }
      if (path === null) continue;
      const file = docForPath(path, from);
      if (own && !file) continue;
      if (file) {
        const target = partWith(file, hash.slice(1));
        a.setAttribute('href', `?tab=${target.id}${hash}`);
        a.dataset.tab = target.id;
        a.dataset.anchor = hash.slice(1);
      } else {
        a.setAttribute('href', `${REPO_URL}/blob/main/${dirOf(doc.file)}${path}${hash}`);
      }
    }

    // Anchors on headings, so links like Manual.md#link-filter land in the right place.
    const used = new Set(doc.usedBefore);
    for (const h of root.querySelectorAll('h1, h2, h3, h4')) h.id = anchorFor(h.textContent, used);

    // Tables scroll sideways on small screens instead of widening the page.
    for (const table of root.querySelectorAll('table')) {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.replaceWith(wrap);
      wrap.appendChild(table);
    }

    if (doc.id === 'changelog') foldVersions(root);

    // A README often opens with rules and empty space once the logo and badges are gone,
    // and with the project's name, which the header above already shows.
    const leading = el => el.tagName === 'HR' || !el.textContent.trim() && !el.querySelector('img')
      || doc.id === 'overview' && el.tagName === 'H1';
    while (root.firstElementChild && leading(root.firstElementChild)) root.firstElementChild.remove();
    // a tab of a split document ends with the rule before the next one
    while (root.lastElementChild && root.lastElementChild.tagName === 'HR') root.lastElementChild.remove();

    const article = $('#doc');
    article.replaceChildren(root);
    article.setAttribute('aria-labelledby', `tab-${doc.id}`);
    buildToc(article);
  }

  function buildToc(article) {
    const headings = [...article.querySelectorAll('h1, h2')];
    const toc = $('#toc');
    if (headings.length < 3) { toc.innerHTML = ''; return; }
    toc.innerHTML = '<p class="toc__title">On this page</p>' + headings.map(h =>
      `<a class="toc__${h.tagName.toLowerCase()}" href="#${esc(h.id)}">${esc(h.textContent.trim())}</a>`).join('');
  }

  // The "Try it" tab: the playground and the game's rules load the first time it opens, and the
  // table stays as it was while another tab shows, so a hand in play is still there on the way back.
  let playground = null;
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  function showPlayground(article) {
    if (!playground) {
      playground = document.createElement('div');
      playground.innerHTML = '<p class="doc-status">Setting up the table…</p>';
      loadScript(`${ROOT}assets/js/playground.js`)
        .then(() => loadScript(`${ROOT}assets/js/playground/${p.page.split('/')[1]}.js`))
        .then(() => window.Playground.mount(playground, { game: window.PlaygroundGames[repo], overlay: 'playground.html', name: p.name, track: repo }))
        .catch(() => { playground.innerHTML = '<p class="doc-status">The playground could not be loaded. Please try again later.</p>'; });
    }
    article.classList.remove('md');
    article.replaceChildren(playground);
    $('#toc').innerHTML = '';
  }

  let current = null;

  function showTab(id, anchor, push) {
    if (!available.length) return;
    // an address like /#-setup from before a document was split still finds its heading
    const doc = partWith(available.find(d => d.id === id) || available[0], anchor);
    current = doc.id;
    const bar = $('#tabs');
    for (const tab of bar.querySelectorAll('.tab')) {
      const on = tab.dataset.tab === doc.id;
      tab.setAttribute('aria-selected', on);
      tab.tabIndex = on ? 0 : -1;
      // on a narrow screen the row scrolls sideways; keep the chosen tab in view
      if (on) {
        const t = tab.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        bar.scrollLeft += t.left - b.left - (b.width - t.width) / 2;
      }
    }
    const article = $('#doc');
    if (doc.playground) {
      showPlayground(article);
    } else {
      article.classList.add('md');
      render(doc);
    }
    article.setAttribute('aria-labelledby', `tab-${doc.id}`);
    const url = (doc.id === 'overview' ? location.pathname : `?tab=${doc.id}`) + (anchor ? `#${anchor}` : '');
    history[push ? 'pushState' : 'replaceState'](null, '', url);
    let heading = anchor;
    try { heading = decodeURIComponent(anchor); } catch (e) { /* keep it as it is */ }
    const target = heading && document.getElementById(heading);
    if (target) { reveal(target); target.scrollIntoView(); }
    else if (push) $('.tabs-bar').scrollIntoView();
  }

  // From the page where update-pages.js put them, from GitHub otherwise.
  async function loadDocs() {
    let found;
    if (PRERENDERED.length) {
      found = PRERENDERED;
      // no changelog and no releases when the page was written: the commit history, live
      if (!found.some(doc => doc.id === 'changelog')) found.push({ ...DOCS.find(doc => doc.id === 'changelog'), html: await changelogFromGitHub() });
    } else {
      const loaded = (await Promise.all(DOCS.map(async doc => {
        const file = fileIn(doc.file);
        const res = file && await fetch(RAW + file).catch(() => null);
        if (res && res.ok) return { ...doc, text: await res.text() };
        if (doc.id === 'changelog') return { ...doc, html: await changelogFromGitHub() };
        return null;
      }))).filter(Boolean);
      const taken = new Set(loaded.map(doc => doc.id));
      found = loaded.flatMap(doc => doc.text != null ? splitDoc(doc, doc.text, taken) : [doc]);
      for (const doc of found) if (doc.html == null) doc.html = window.marked.parse(doc.text, { gfm: true });
    }
    available = withAnchors(found);
    // the playground of a game, right after its overview
    if (p.playground && available.length) available.splice(1, 0, { id: 'try', label: 'Try it', file: '', playground: true });
    if (!available.length) {
      $('#doc').innerHTML = `<p class="doc-status">The documents could not be loaded. <a href="${REPO_URL}">Read them on GitHub</a>.</p>`;
      return;
    }
    $('#tabs').innerHTML = available.map(doc =>
      `<button class="tab" type="button" role="tab" id="tab-${doc.id}" data-tab="${doc.id}" data-track="tab-${doc.id}" aria-controls="doc">${esc(doc.label)}</button>`).join('');
    const params = new URLSearchParams(location.search);
    showTab(params.get('tab') || 'overview', location.hash.slice(1), false);
  }

  /* ---------- page chrome ---------- */

  function setupEvents() {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-tab], .tab');
      if (!link) return;
      event.preventDefault();
      showTab(link.dataset.tab, link.dataset.anchor, true);
    });
    $('#tabs').addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const tabs = [...document.querySelectorAll('.tab')];
      const next = tabs[(tabs.indexOf(document.activeElement) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      showTab(next.dataset.tab, '', true);
    });
    // Back and forward switch tabs again; jumps within the same document need no re-render.
    window.addEventListener('popstate', () => {
      const id = new URLSearchParams(location.search).get('tab') || 'overview';
      if (id !== current) showTab(id, location.hash.slice(1), false);
    });
    // a link to a heading inside a folded version opens that version first
    window.addEventListener('hashchange', () => {
      const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target && target.closest('details:not([open])')) { reveal(target); target.scrollIntoView(); }
    });
  }

  function setupTheme() {
    const toggle = $('#theme-toggle');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const apply = (theme, save) => {
      document.documentElement.dataset.theme = theme;
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      if (themeColor) themeColor.content = theme === 'dark' ? '#0b0a12' : '#f5f6f8';
      if (save) {
        try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }
      }
    };
    apply(document.documentElement.dataset.theme, false);
    toggle.addEventListener('click', () => apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));
  }

  function setupLightbox() {
    const dialog = $('#lightbox');
    const img = dialog.querySelector('img');
    const caption = dialog.querySelector('.lightbox__caption');
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-full]');
      if (!trigger) return;
      img.style.width = img.style.height = '';
      img.src = trigger.dataset.full;
      img.alt = trigger.querySelector('img')?.alt || '';
      caption.textContent = trigger.dataset.caption || '';
      dialog.showModal();
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => img.removeAttribute('src'));
  }

  // Same statistics as the start page (see privacy.html), with the project on every click.
  function setupStats() {
    if (!stats || !stats.websiteId) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = stats.script;
    script.dataset.websiteId = stats.websiteId;
    if (stats.domain) script.dataset.domains = stats.domain;
    document.head.appendChild(script);
    document.addEventListener('click', event => {
      const el = event.target.closest('[data-track]');
      if (el && window.umami) window.umami.track(el.dataset.track, { project: repo });
    });
  }

  $('#main').innerHTML = header();
  document.title = `${p.name} · aaskjer`;
  setupTheme();
  setupLightbox();
  setupEvents();
  setupStats();
  $('#year').textContent = new Date().getFullYear();
  refreshNumbers();
  setupImportString();
  loadDocs();
})();
