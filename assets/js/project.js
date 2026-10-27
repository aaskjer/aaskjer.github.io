/*
 * A project's own page. The header comes from projects.js; the documents below it
 * (README, setup guide, manual, FAQ, changelog) are loaded live from the project's
 * GitHub repository and turned into HTML in the browser, so the page always shows
 * what the repository says.
 */
(() => {
  'use strict';

  const { user, stats, projects } = window.SITE;
  const repo = document.body.dataset.repo;
  const p = projects.find(x => x.repo === repo);
  const ROOT = '../';
  const API = 'https://api.github.com';
  const RAW = `https://raw.githubusercontent.com/${user}/${repo}/main/`;
  const REPO_URL = `https://github.com/${user}/${encodeURIComponent(repo)}`;
  // the start page's answers from the GitHub API, used for as long as the start page uses them
  const CACHE_KEY = 'github-live-v4';
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
    complete: { label: 'Feature Complete', note: 'All planned features are in: no big updates planned, only fixes and polish.' },
    done: { label: 'Done', note: 'Finished: no more updates planned, apart from fixes if something breaks.' },
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
    let note = status ? status.note : '';
    if ((p.status === 'complete' || p.status === 'done') && p.section === 'games') {
      note += ' The games get one more round if Streamer.bot ships its own points system.';
    }
    const label = status ? `<span class="badge badge--${p.status}" title="${esc(note)}">${status.label}</span>` : '';
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
    if (p.downloads) items.push(`<span class="meta" title="Downloads">${icon('download')}${numberFormat.format(p.downloads)}<span class="sr-only"> downloads</span></span>`);
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
    const download = p.download || `${REPO_URL}/releases/latest`;
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
              <div class="project-hero__actions">
                ${p.download === false ? '' : `<a class="btn btn--primary" href="${esc(download)}" data-track="download">${icon('download')}${esc(p.downloadLabel || 'Download')}</a>`}
                <button class="btn btn--ghost" type="button" id="copy-import" data-track="import-string" hidden>${icon('copy')}Copy import string</button>
                <a class="btn btn--ghost" href="${REPO_URL}" data-track="github">${icon('github')}GitHub</a>
                <a class="btn btn--ghost" href="${REPO_URL}/issues/new/choose" data-track="report">${icon('flag')}Report a problem</a>
              </div>
              <div class="meta-row" id="meta">${metaRow()}</div>
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
      <div class="tabs-bar">
        <div class="wrap"><nav class="tabs" role="tablist" aria-label="Documents" id="tabs"></nav></div>
      </div>
      <div class="wrap project-doc">
        <article class="md" id="doc" role="tabpanel"><p class="doc-status">Loading the documents from GitHub…</p></article>
        <aside class="toc" id="toc" aria-label="On this page"></aside>
      </div>`;
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
    const button = $('.project-hero__actions [data-track="download"]');
    if (live.pre && !live.version && !p.download && button) button.href = `${REPO_URL}/releases/tag/${encodeURIComponent(live.pre.version)}`;
    $('#meta').innerHTML = metaRow();
    $('.project-hero .badges').outerHTML = badges();
  }

  /* ---------- import string ---------- */

  async function importString() {
    const text = await fetch(RAW + IMPORT_FILE).then(res => res.ok ? res.text() : Promise.reject(res.status));
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
    const button = $('#copy-import');
    const head = await fetch(RAW + IMPORT_FILE, { method: 'HEAD' }).catch(() => null);
    if (!head || !head.ok) return;
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

  const docText = {};
  const docHtml = {};
  let available = [];

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
    const source = doc.file in docHtml ? docHtml[doc.file] : window.marked.parse(docText[doc.file], { gfm: true });
    const html = window.DOMPurify.sanitize(source, { ADD_ATTR: ['align'] });
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
      if (href.startsWith('#')) continue;
      let path = null;
      let from = doc.file;
      let hash = '';
      // links to a file of this repository on GitHub (an empty path after /tree/main is the README)
      const own = href.match(new RegExp(`^https://github\\.com/${user}/${repo}/(?:blob|tree)/[^/]+/?([^#?]*)(#.*)?$`, 'i'));
      if (own) { path = own[1]; hash = own[2] || ''; from = ''; }
      else if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) { [path, hash = ''] = href.split(/(?=#)/); }
      if (path === null) continue;
      const target = docForPath(path, from);
      if (own && !target) continue;
      if (target) {
        a.setAttribute('href', `?tab=${target.id}${hash}`);
        a.dataset.tab = target.id;
        a.dataset.anchor = hash.slice(1);
      } else {
        a.setAttribute('href', `${REPO_URL}/blob/main/${dirOf(doc.file)}${path}${hash}`);
      }
    }

    // Anchors on headings, so links like Manual.md#link-filter land in the right place.
    const used = new Set();
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

  let current = null;

  function showTab(id, anchor, push) {
    const doc = available.find(d => d.id === id) || available[0];
    if (!doc) return;
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
    render(doc);
    const url = (doc.id === 'overview' ? location.pathname : `?tab=${doc.id}`) + (anchor ? `#${anchor}` : '');
    history[push ? 'pushState' : 'replaceState'](null, '', url);
    const target = anchor && document.getElementById(anchor);
    if (target) { reveal(target); target.scrollIntoView(); }
    else if (push) $('.tabs-bar').scrollIntoView();
  }

  async function loadDocs() {
    await Promise.all(DOCS.map(async doc => {
      const res = await fetch(RAW + doc.file).catch(() => null);
      if (res && res.ok) docText[doc.file] = await res.text();
      else if (doc.id === 'changelog') docHtml[doc.file] = await changelogFromGitHub();
    }));
    available = DOCS.filter(doc => docText[doc.file] != null || docHtml[doc.file] != null);
    if (!available.length) {
      $('#doc').innerHTML = `<p class="doc-status">The documents could not be loaded. <a href="${REPO_URL}">Read them on GitHub</a>.</p>`;
      return;
    }
    $('#tabs').innerHTML = available.map(doc =>
      `<button class="tab" type="button" role="tab" id="tab-${doc.id}" data-tab="${doc.id}" data-track="tab-${doc.id}" aria-controls="doc">${doc.label}</button>`).join('');
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
      if (themeColor) themeColor.content = theme === 'dark' ? '#0b0a12' : '#f6f5fb';
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
