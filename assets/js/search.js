/*
 * The search behind the magnifier in the header, also on Ctrl+K (⌘K) and /. It finds projects,
 * their chat commands (!slots) and the headings of their documents, from assets/search.json,
 * which _tools/update-pages.js writes. It runs on the start page and on every project page, and
 * loads the index the first time it opens.
 */
(() => {
  'use strict';

  const button = document.getElementById('search-open');
  if (!button || !window.HTMLDialogElement) return;
  // the site's root, from where this file sits (assets/js/)
  const ROOT = new URL('../../', document.currentScript.src);
  const LIMITS = { project: 5, command: 6, section: 8 };
  const GROUPS = [['project', 'Projects'], ['command', 'Commands'], ['section', 'In the guides']];

  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = name => `<svg class="i" aria-hidden="true"><use href="${ROOT}assets/img/icons.svg#i-${name}"/></svg>`;
  // lower case, without accents, so "Bücher" finds "bucher" and the other way round
  const norm = text => String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const site = window.SITE || { projects: [] };

  let entries = null;
  let loading = null;
  let results = [];
  let active = -1;

  /* ---------- the index ---------- */

  function load() {
    return loading || (loading = fetch(new URL('assets/search.json', ROOT))
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(index => {
        const projects = index.projects.map(p => {
          const known = site.projects.find(x => x.page === p.page) || {};
          return { ...p, repo: known.repo, logo: known.logo, mono: known.mono };
        });
        entries = [
          ...projects.map(p => ({ kind: 'project', title: p.name, sub: p.text, href: p.page, p,
            fields: [[p.name, 10], [p.repo, 6], [p.text, 2], [p.keys, 2]] })),
          ...index.commands.map(c => ({ kind: 'command', title: c.command, sub: [projects[c.p].name, c.where].filter(Boolean).join(' · '),
            href: c.href, p: projects[c.p], fields: [[c.command, 12], [projects[c.p].name, 1]] })),
          ...index.sections.map(s => ({ kind: 'section', title: s.title, sub: `${projects[s.p].name} · ${s.where}`,
            href: s.href, p: projects[s.p], fields: [[s.title, 6], [projects[s.p].name, 1.5], [s.where, 1]] })),
        ];
        for (const entry of entries) entry.fields = entry.fields.filter(([text]) => text).map(([text, weight]) => [norm(text), weight]);
      })
      .catch(error => { loading = null; throw error; }));
  }

  // How well an entry fits, and how many of the words it has: a whole field beats its start, its
  // start a word's start, that a match inside a word.
  function score(entry, words) {
    let total = 0;
    let matched = 0;
    for (const word of words) {
      let best = 0;
      for (const [text, weight] of entry.fields) {
        const at = text.indexOf(word);
        if (at < 0) continue;
        const kind = text === word ? 4 : at === 0 ? 3 : /[^a-z0-9]/.test(text[at - 1]) ? 2 : 1;
        best = Math.max(best, kind * weight);
      }
      if (best) matched++;
      total += best;
    }
    return { total, matched };
  }

  // The entries with every word; where none has them all, the ones with the most of them.
  function find(query) {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return entries.filter(e => e.kind === 'project');
    let scored = entries.map(entry => ({ entry, ...score(entry, words) })).filter(r => r.matched);
    const most = Math.max(0, ...scored.map(r => r.matched));
    scored = scored.filter(r => r.matched === most)
      .sort((a, b) => b.total - a.total || a.entry.title.length - b.entry.title.length);
    const list = [];
    for (const [kind] of GROUPS) list.push(...scored.filter(r => r.entry.kind === kind).slice(0, LIMITS[kind]).map(r => r.entry));
    return list;
  }

  /* ---------- the dialog ---------- */

  const dialog = document.createElement('dialog');
  dialog.className = 'search';
  dialog.setAttribute('aria-label', 'Search');
  dialog.innerHTML = `
    <div class="search__bar">
      ${icon('search')}
      <input class="search__input" type="search" role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list"
             aria-label="Search projects, commands and guides" placeholder="Projects, commands like !slots, guides…" autocomplete="off" spellcheck="false">
      <button class="search__close" type="button" aria-label="Close the search"><kbd>Esc</kbd></button>
    </div>
    <div class="search__results" id="search-results" role="listbox" aria-label="Results"></div>
    <p class="search__foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p>
    <p class="sr-only" aria-live="polite" id="search-status"></p>`;
  document.body.appendChild(dialog);
  const input = dialog.querySelector('.search__input');
  const list = dialog.querySelector('.search__results');
  const status = dialog.querySelector('#search-status');

  // the words of the query marked in a title
  function highlight(text, query) {
    const words = query.trim().split(/\s+/).filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!words.length) return esc(text);
    return text.split(new RegExp(`(${words.join('|')})`, 'gi'))
      .map((piece, i) => i % 2 ? `<mark>${esc(piece)}</mark>` : esc(piece)).join('');
  }

  function tile(entry) {
    if (entry.kind === 'command') return `<span class="search__icon">${icon('terminal')}</span>`;
    if (entry.kind === 'section') return `<span class="search__icon">${icon('file')}</span>`;
    const p = entry.p;
    if (p.logo) return `<span class="search__icon search__icon--logo"><img src="${ROOT}${esc(p.logo)}" alt="" width="28" height="28"></span>`;
    const mono = p.mono || p.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
    return `<span class="search__icon search__icon--mono">${esc(mono)}</span>`;
  }

  // A result on the page that is open goes to project.js, which switches the tab without loading
  // the page again.
  function samePage(url) {
    if (url.pathname !== location.pathname || !document.getElementById('tabs')) return '';
    const tab = url.searchParams.get('tab') || 'overview';
    return ` data-tab="${esc(tab)}" data-anchor="${esc(url.hash.slice(1))}"`;
  }

  function show() {
    const query = input.value;
    results = find(query);
    active = results.length ? 0 : -1;
    let n = 0;
    const html = GROUPS.map(([kind, label]) => {
      const items = results.filter(r => r.kind === kind);
      if (!items.length) return '';
      return `<div class="search__group" role="group" aria-labelledby="search-g-${kind}">
        <p class="search__label" id="search-g-${kind}" role="presentation">${query.trim() ? label : 'All projects'}</p>
        ${items.map(entry => {
          const url = new URL(entry.href, ROOT);
          const i = n++;
          return `<a class="search__item" role="option" id="search-r-${i}" data-i="${i}" href="${esc(url.href)}"${samePage(url)}
                     aria-selected="false" tabindex="-1" data-track="search-result" data-project="${esc(entry.p.repo || '')}">
            ${tile(entry)}
            <span class="search__text">
              <span class="search__title">${highlight(entry.title, query)}</span>
              ${entry.sub ? `<span class="search__sub">${esc(entry.sub)}</span>` : ''}
            </span>
          </a>`;
        }).join('')}
      </div>`;
    }).join('');
    // the list is in the order of the groups, like the links
    results = GROUPS.flatMap(([kind]) => results.filter(r => r.kind === kind));
    list.innerHTML = html || `<p class="search__empty">Nothing found for “${esc(query.trim())}”. Try a project, a command like <code>!slots</code>, or a word like overlay or Discord.</p>`;
    status.textContent = query.trim() ? `${results.length || 'No'} result${results.length === 1 ? '' : 's'}` : '';
    mark(active, false);
  }

  function mark(i, scroll) {
    for (const item of list.querySelectorAll('.search__item')) item.setAttribute('aria-selected', String(+item.dataset.i === i));
    active = i;
    const item = list.querySelector(`#search-r-${i}`);
    if (item) {
      input.setAttribute('aria-activedescendant', item.id);
      if (scroll) item.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  async function open() {
    if (dialog.open) return;
    dialog.showModal();
    input.focus();
    input.select();
    if (!entries) {
      list.innerHTML = '<p class="search__empty">Loading…</p>';
      try { await load(); } catch (e) {
        list.innerHTML = '<p class="search__empty">The search could not be loaded. Please try again later.</p>';
        return;
      }
    }
    show();
  }

  input.addEventListener('input', () => { if (entries) show(); });
  input.addEventListener('keydown', event => {
    if (!results.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      mark((active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length, true);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      list.querySelector(`#search-r-${active}`).click();
    }
  });
  list.addEventListener('pointermove', event => {
    const item = event.target.closest('.search__item');
    if (item && +item.dataset.i !== active) mark(+item.dataset.i, false);
  });
  list.addEventListener('click', event => { if (event.target.closest('.search__item')) dialog.close(); });
  dialog.querySelector('.search__close').addEventListener('click', () => dialog.close());
  // a click on the dimmed backdrop lands on the dialog element itself
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  button.hidden = false;
  button.addEventListener('click', open);
  // the index loads as soon as the visitor heads for the button
  for (const type of ['pointerenter', 'focus']) button.addEventListener(type, () => load().catch(() => {}), { once: true });
  document.addEventListener('keydown', event => {
    const typing = event.target.closest('input, textarea, select, [contenteditable]');
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k'
        || event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (dialog.open) dialog.close(); else open();
    }
  });
})();
