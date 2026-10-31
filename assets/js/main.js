/*
 * Renders the projects from projects.js and refreshes their numbers
 * (stars, downloads, latest version, last update) from the GitHub API.
 */
(() => {
  'use strict';

  const { user, twitch, stats, projects, comingSoon = [] } = window.SITE;
  const feature = Object.assign({ fallback: null, days: 7, max: 3, downloads: { days: 7, min: 20 } }, window.SITE.featured);
  const API = 'https://api.github.com';
  // the downloads of every repository once a day, recorded by .github/workflows/download-counts.yml
  const HISTORY_URL = `https://raw.githubusercontent.com/${user}/${user}.github.io/stats/downloads.json`;
  const DAY = 24 * 60 * 60 * 1000;
  const CACHE_KEY = 'github-live-v5';
  // GitHub allows 60 requests per hour without a token, so one visit's
  // answers are kept for an hour.
  const CACHE_TTL = 60 * 60 * 1000;
  // A change to projects.js (a new release entered, say) drops the kept answers at once.
  const SITE_STAMP = stamp(JSON.stringify(window.SITE));
  const PLATFORM_TOPICS = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', discord: 'Discord', obs: 'OBS' };

  const $ = sel => document.querySelector(sel);
  const repoUrl = repo => `https://github.com/${user}/${encodeURIComponent(repo)}`;
  // A project's own page on this site where it has one, its GitHub repository otherwise.
  const projectUrl = p => p.page || repoUrl(p.repo);
  const numberFormat = new Intl.NumberFormat('en');
  const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = name => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  let extras = [];

  // Releases since the visitor's previous visit get a "New" badge. A visit ends after
  // 30 minutes without a page view; on a first visit nothing is marked.
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

  function timeAgo(iso) {
    const seconds = (new Date(iso) - Date.now()) / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
    }
    return 'just now';
  }

  /* ---------- markup ---------- */

  function logoTile(p) {
    if (p.logo) return `<div class="tile"><img src="${esc(p.logo)}" alt="" width="64" height="64" decoding="async"></div>`;
    const mono = p.mono || (p.name || p.repo).split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
    return `<div class="tile tile--mono"><span class="grad">${esc(mono)}</span></div>`;
  }

  // Platforms first, then tags; past `max` chips the rest share a "+3" chip, so a card keeps one row.
  function chips(p, max = Infinity) {
    const all = (p.platforms || []).map(name => ({ name, cls: `chip--${slug(name)}` }))
      .concat((p.tags || []).map(name => ({ name, cls: 'chip--tag' })));
    const shown = all.length > max ? all.slice(0, max - 1) : all;
    const rest = all.slice(shown.length).map(item => item.name);
    const items = shown.map(item => `<li class="chip ${item.cls}">${esc(item.name)}</li>`);
    if (rest.length) {
      items.push(`<li class="chip chip--more" title="${esc(rest.join(', '))}">+${rest.length}<span class="sr-only"> more: ${esc(rest.join(', '))}</span></li>`);
    }
    return items.length ? `<ul class="chips" aria-label="Works with">${items.join('')}</ul>` : '';
  }

  function metaRow(p) {
    const items = [`<span class="meta" title="GitHub stars">${icon('star')}${numberFormat.format(p.stars || 0)}<span class="sr-only"> stars</span></span>`];
    // shown at 0 too; null means GitHub did not answer
    if (p.downloads != null) {
      items.push(`<span class="meta" title="Downloads">${icon('download')}${numberFormat.format(p.downloads)}<span class="sr-only"> downloads</span></span>`);
    }
    if (p.updated) {
      const date = new Date(p.updated).toLocaleDateString('en', { dateStyle: 'medium' });
      items.push(`<span class="meta" title="Last update: ${esc(date)}">${icon('clock')}<span class="sr-only">updated </span>${timeAgo(p.updated)}</span>`);
    }
    return items.join('');
  }

  // The guide button opens the matching tab of the project's own page where there is one.
  const GUIDE_TABS = { 'setup-guide.md': 'setup', 'manual.md': 'manual', 'faq.md': 'faq' };

  function guideUrl(p) {
    const href = p.guide.href;
    if (p.page) {
      const tab = GUIDE_TABS[href.toLowerCase()];
      if (tab) return `${p.page}?tab=${tab}`;
      const readme = href.match(new RegExp(`^https://github\\.com/${user}/${p.repo}/?(#.*)?$`, 'i'));
      if (readme) return p.page + (readme[1] || '');
    }
    return /^https?:/.test(href) ? href : `${repoUrl(p.repo)}/blob/main/${href}`;
  }

  // `compact`: the cards in the lists, with the guide as an icon beside the download button.
  function actions(p, { github = false, compact = false } = {}) {
    if (p.comingSoon) return `<span class="btn btn--sm btn--soon">${icon('clock')}Coming Soon</span>`;
    const url = repoUrl(p.repo);
    const name = p.name || p.repo;
    // a game with a playground: the "Try it" tab of its page
    const tryIt = p.playground && p.page ? `${p.page}?tab=try` : null;
    if (compact) {
      const links = [];
      if (tryIt) {
        links.push(`<a class="btn btn--ghost btn--sm btn--icon" href="${esc(tryIt)}" data-track="playground-link" title="Try it in your browser" aria-label="Try ${esc(name)} in your browser">${icon('play')}</a>`);
      }
      if (p.guide) {
        links.push(`<a class="btn btn--ghost btn--sm btn--icon" href="${esc(guideUrl(p))}" data-track="guide" title="${esc(p.guide.label)}" aria-label="${esc(p.guide.label)}: ${esc(name)}">${icon('book')}</a>`);
      }
      if (p.download !== false) {
        links.push(`<a class="btn btn--primary btn--sm" href="${esc(p.download || `${url}/releases/latest`)}" data-track="download" aria-label="Download ${esc(name)}">${icon('download')}${esc(p.downloadLabel || 'Download')}</a>`);
      } else if (!p.guide) {
        links.push(`<a class="btn btn--ghost btn--sm" href="${url}" data-track="github">${icon('github')}GitHub</a>`);
      }
      return links.join('');
    }
    const links = [];
    if (p.download !== false) {
      links.push(`<a class="btn btn--primary btn--sm" href="${esc(p.download || `${url}/releases/latest`)}" data-track="download">${icon('download')}${esc(p.downloadLabel || 'Download')}</a>`);
    }
    if (tryIt) {
      links.push(`<a class="btn btn--ghost btn--sm" href="${esc(tryIt)}" data-track="playground-link">${icon('play')}Try it</a>`);
    }
    if (p.guide) {
      links.push(`<a class="btn btn--ghost btn--sm" href="${esc(guideUrl(p))}" data-track="guide">${icon('book')}${esc(p.guide.label)}</a>`);
    }
    if (github || !links.length) {
      links.push(`<a class="btn btn--ghost btn--sm" href="${url}" data-track="github">${icon('github')}GitHub</a>`);
    }
    return links.join('');
  }

  function badge(p) {
    return `<span class="badge"${p.version ? '' : ' hidden'}>${esc(p.version || '')}</span>`;
  }

  // A pre-release newer than the latest stable version, e.g. "v2.0.0 Pre-release".
  function preBadge(p) {
    if (!p.pre) return '';
    return `<span class="badge badge--pre" title="${esc(p.pre.version)}, out ${esc(timeAgo(p.pre.released))}: a test version of what comes next, not finished yet">${esc(p.pre.version.replace(/-.*/, ''))} Pre-release</span>`;
  }

  // Since the last visit: "New" when the project's first release came out, "Updated" for a later one
  // (a pre-release too).
  function newBadge(p) {
    const latest = p.pre ? p.pre.released : p.released;
    if (!latest || !previousVisit || new Date(latest) <= previousVisit) return '';
    if (p.firstReleased && new Date(p.firstReleased) > previousVisit) {
      return `<span class="badge badge--new" title="First released ${esc(timeAgo(p.firstReleased))}, since your last visit">New</span>`;
    }
    const what = p.pre ? `Pre-release ${p.pre.version}` : p.version || 'A new version';
    return `<span class="badge badge--updated" title="${esc(what)} released ${esc(timeAgo(latest))}, since your last visit">Updated</span>`;
  }

  const STATUS = {
    dev: { label: 'In development', note: 'Actively worked on: new features and changes are still coming.' },
    // a project is either in development or has no label: finished, apart from fixes
    done: { label: 'Done', note: 'Finished: no more updates planned, apart from fixes if something breaks.', hidden: true },
  };

  // Version and status side by side, e.g. "v16.1.1" and a yellow "In development".
  function badges(p) {
    const status = STATUS[p.status];
    const label = status && !status.hidden ? `<span class="badge badge--${p.status}" title="${esc(status.note)}">${status.label}</span>` : '';
    return `<span class="badges">${badge(p)}${preBadge(p)}${newBadge(p)}${label}</span>`;
  }

  // The picture on top of a card; a click opens the full-size version in the lightbox.
  function shot(p) {
    if (!p.scene) return '';
    const name = p.name || p.repo;
    const thumb = p.scene.replace(/(\.\w+)$/, '-thumb$1');
    return `
        <button class="card__shot" type="button" data-track="scene" data-full="${esc(p.scene)}" data-size="1600x900"
                data-caption="${esc(name)} · example scene with sample chat" aria-label="Show a larger picture of ${esc(name)}">
          <img src="${esc(thumb)}" alt="${esc(p.sceneAlt || '')}" width="960" height="540" loading="lazy" decoding="async">
          <span class="zoom">${icon('expand')}</span>
        </button>`;
  }

  // A card in the lists: picture, name, the description in two lines, one row of chips, numbers
  // and buttons. On a phone it turns into a row of a list (see .grid > .card in style.css).
  function card(p) {
    const text = p.tagline || 'No description yet.';
    return `
      <article class="card" data-repo="${esc(p.repo)}">
        ${shot(p)}
        <div class="card__head">
          ${logoTile(p)}
          <div class="card__heading">
            <h3 class="card__title"><a href="${esc(projectUrl(p))}" data-track="${p.page ? 'project' : 'repo'}">${esc(p.name || p.repo)}</a></h3>
            ${badges(p)}
          </div>
        </div>
        <p class="card__text" title="${esc(text)}">${esc(text)}</p>
        ${chips(p, 4)}
        <div class="card__foot">
          <div class="meta-row">${metaRow(p)}</div>
          <div class="actions actions--compact">${actions(p, { compact: true })}</div>
        </div>
      </article>`;
  }

  // The picture beside a featured project: its settings window where there is a screenshot, its scene otherwise.
  function spotlightShot(p) {
    const name = p.name || p.repo;
    if (p.screenshot) return `
        <figure class="spotlight__shot">
          <div class="window-bar" aria-hidden="true"><span></span><span></span><span></span></div>
          <button class="shot-zoom" type="button" data-track="scene" data-full="${esc(p.screenshotFull || p.screenshot)}" data-size="${p.screenshotFull ? '940x1461' : '940x640'}"
                  data-caption="${esc(name)} · settings window" aria-label="Show the whole ${esc(name)} settings window">
            <img src="${esc(p.screenshot)}" alt="The ${esc(name)} settings window" width="940" height="640" loading="lazy" decoding="async">
            <span class="zoom">${icon('expand')}</span>
          </button>
        </figure>`;
    if (!p.scene) return '';
    const thumb = p.scene.replace(/(\.\w+)$/, '-thumb$1');
    return `
        <figure class="spotlight__shot">
          <button class="shot-zoom" type="button" data-track="scene" data-full="${esc(p.scene)}" data-size="1600x900"
                  data-caption="${esc(name)} · example scene with sample chat" aria-label="Show a larger picture of ${esc(name)}">
            <img src="${esc(thumb)}" srcset="${esc(thumb)} 960w, ${esc(p.scene)} 1600w" sizes="(max-width: 900px) 92vw, 640px"
                 alt="${esc(p.sceneAlt || '')}" width="960" height="540" loading="lazy" decoding="async">
            <span class="zoom">${icon('expand')}</span>
          </button>
        </figure>`;
  }

  // After a release, the first sentence of its notes.
  function whatsNew(p, reason) {
    if (!p.notes || !reason || reason.kind !== 'release') return '';
    return `<p class="whats-new"><strong>What's new:</strong> ${esc(p.notes)}</p>`;
  }

  function spotlight(p, reason) {
    return `
      <article class="spotlight" data-repo="${esc(p.repo)}">
        <div class="spotlight__body">
          <div class="card__head">
            ${logoTile(p)}
            <div class="card__heading">
              ${reason ? `<p class="kicker">${esc(reason.text)}</p>` : ''}
              <h3 class="spotlight__title"><a href="${esc(projectUrl(p))}" data-track="${p.page ? 'project' : 'repo'}">${esc(p.name || p.repo)}</a></h3>
            </div>
          </div>
          <p class="spotlight__text">${esc(p.tagline || 'No description yet.')}</p>
          ${p.features ? `<ul class="features">
            ${p.features.map(f => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}
          </ul>` : whatsNew(p, reason)}
          ${chips(p)}
          <div class="spotlight__foot">
            <div class="meta-row">${badges(p)}${metaRow(p)}</div>
            <div class="actions">${actions(p, { github: true })}</div>
          </div>
        </div>
        ${spotlightShot(p)}
      </article>`;
  }

  // A featured project below the big one: a card with its scene, why it is featured and what is new.
  function update(p, reason) {
    return `
      <article class="card card--update" data-repo="${esc(p.repo)}">
        ${shot(p)}
        <div class="card__head">
          ${logoTile(p)}
          <div class="card__heading">
            ${reason ? `<p class="kicker">${esc(reason.text)}</p>` : ''}
            <h3 class="card__title"><a href="${esc(projectUrl(p))}" data-track="${p.page ? 'project' : 'repo'}">${esc(p.name || p.repo)}</a></h3>
            ${badges(p)}
          </div>
        </div>
        <p class="card__text card__text--full">${esc(p.tagline || 'No description yet.')}</p>
        ${whatsNew(p, reason)}
        <div class="card__foot">
          <div class="meta-row">${metaRow(p)}</div>
          <div class="actions">${actions(p)}</div>
        </div>
      </article>`;
  }

  function collage() {
    // the logos repeat the card links, so only the avatar is reachable by keyboard
    const tiles = projects.filter(p => p.logo).slice(0, 8).map((p, i) =>
      `<a class="collage__tile" style="--i:${i}" href="${esc(projectUrl(p))}" tabindex="-1" aria-hidden="true" data-track="logo" data-project="${esc(p.repo)}"><img src="${esc(p.logo)}" alt=""></a>`);
    const avatar = '<img src="assets/img/avatar.png" alt="">';
    tiles.splice(4, 0, twitch
      ? `<a class="collage__tile collage__tile--me" style="--i:4" href="${esc(twitch)}" title="aaskjer on Twitch" aria-label="aaskjer on Twitch" data-track="twitch-avatar">${avatar}<span class="collage__badge" aria-hidden="true">Twitch</span></a>`
      : `<div class="collage__tile collage__tile--me" style="--i:4">${avatar}</div>`);
    return tiles.join('');
  }

  /* ---------- the Featured box ---------- */

  // { days: { 'YYYY-MM-DD': { repository name in lower case: downloads } } }, once loaded
  let downloadHistory = null;

  const STATUS_NEWS = { dev: 'In development again', done: 'Now finished' };

  // Downloads in the last `downloads.days` days, from the daily counts. Until the history is that
  // long, it counts from its first day; a history that stopped two days ago counts nothing.
  function recentDownloads(p) {
    const days = downloadHistory && downloadHistory.days;
    if (!days) return null;
    const dates = Object.keys(days).sort();
    const newest = dates[dates.length - 1];
    if (!newest || Date.now() - Date.parse(newest) > 2 * DAY) return null;
    const start = new Date(Date.parse(newest) - feature.downloads.days * DAY).toISOString().slice(0, 10);
    const from = dates.find(date => date >= start && date < newest);
    if (!from) return null;
    const repo = p.repo.toLowerCase();
    const count = (days[newest][repo] || 0) - (days[from][repo] || 0);
    if (count < feature.downloads.min) return null;
    const span = Math.round((Date.parse(newest) - Date.parse(from)) / DAY);
    return { time: Date.parse(newest), text: `${numberFormat.format(count)} downloads in ${span === 7 ? 'a week' : `${span} day${span === 1 ? '' : 's'}`}` };
  }

  // Why a project is featured right now: the newest of a release, a status change and a run of
  // downloads within the last `days` days, or null.
  function featureReason(p) {
    const since = Date.now() - feature.days * DAY;
    const reasons = [];
    const release = p.pre ? p.pre.released : p.released;
    if (release && Date.parse(release) > since) {
      const text = release === p.firstReleased ? 'First release' : p.pre ? 'New pre-release' : 'New release';
      reasons.push({ time: Date.parse(release), text, kind: 'release' });
    }
    if (p.statusSince && STATUS_NEWS[p.status] && Date.parse(p.statusSince) > since) {
      reasons.push({ time: Date.parse(p.statusSince), text: STATUS_NEWS[p.status] });
    }
    const downloads = recentDownloads(p);
    if (downloads) reasons.push(downloads);
    return reasons.sort((a, b) => b.time - a.time)[0] || null;
  }

  function featuredList() {
    const list = projects.map(p => ({ p, reason: featureReason(p) })).filter(f => f.reason)
      .sort((a, b) => b.reason.time - a.reason.time).slice(0, feature.max);
    if (list.length) return list;
    const fallback = projects.find(p => p.repo === feature.fallback);
    return fallback ? [{ p: fallback, reason: null }] : [];
  }

  // The newest featured project gets the big box with its highlights and picture; the others sit
  // below it side by side, as cards.
  function renderFeatured() {
    const box = $('#spotlight');
    const list = featuredList();
    // rebuilt only when the projects, their reasons or their release notes change
    const key = list.map(f => `${f.p.repo}:${f.reason ? f.reason.text : ''}:${f.p.notes ? 1 : 0}`).join('|');
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    const [first, ...rest] = list;
    $('#featured').hidden = !first;
    box.innerHTML = first ? `
      <div class="featured__inner">
        ${spotlight(first.p, first.reason)}
        ${rest.length ? `<div class="featured__more">${rest.map(f => update(f.p, f.reason)).join('')}</div>` : ''}
      </div>` : '';
  }

  async function loadHistory() {
    const response = await fetch(HISTORY_URL);
    if (!response.ok) throw new Error(`${response.status} for ${HISTORY_URL}`);
    downloadHistory = await response.json();
  }

  /* ---------- filters ---------- */

  // The row above the lists: each pressed button keeps only the projects that have it, in all three
  // lists (the Featured box stays as it is). The choice stays in the address, e.g. ?with=kick,obs,
  // so a filtered list can be shared.
  const has = (list, name) => (list || []).includes(name);
  const FILTERS = [
    { key: 'twitch', label: 'Twitch', test: p => has(p.platforms, 'Twitch') },
    { key: 'youtube', label: 'YouTube', test: p => has(p.platforms, 'YouTube') },
    { key: 'kick', label: 'Kick', test: p => has(p.platforms, 'Kick') },
    { key: 'discord', label: 'Discord', test: p => has(p.platforms, 'Discord') || has(p.tags, 'Discord') },
    // a repository only GitHub knows of has the topic "obs" as its platform 'OBS'
    { key: 'obs', label: 'OBS overlay', test: p => has(p.tags, 'OBS overlay') || has(p.platforms, 'OBS') },
  ];
  const GRIDS = [['#tools-grid', 'stream tools'], ['#games-grid', 'chat games'], ['#more-grid', 'projects here']];
  const active = new Set((new URLSearchParams(location.search).get('with') || '').split(','));

  function applyFilters() {
    const tests = FILTERS.filter(f => active.has(f.key)).map(f => f.test);
    const byRepo = new Map(projects.concat(extras).map(p => [p.repo, p]));
    let shown = 0;
    let total = 0;
    for (const [selector, noun] of GRIDS) {
      const grid = $(selector);
      const cards = [...grid.children];
      for (const card of cards) {
        const p = byRepo.get(card.dataset.repo);
        card.hidden = !!p && !tests.every(test => test(p));
        total++;
        if (!card.hidden) shown++;
      }
      let empty = grid.nextElementSibling;
      if (!empty || !empty.classList.contains('grid-empty')) {
        empty = document.createElement('p');
        empty.className = 'grid-empty';
        empty.innerHTML = `None of the ${noun} works with all of these. <button type="button" data-clear-filters data-track="filter-clear">Show all</button>`;
        grid.after(empty);
      }
      empty.hidden = !cards.length || cards.some(card => !card.hidden);
    }
    for (const button of document.querySelectorAll('[data-filter]')) {
      button.setAttribute('aria-pressed', String(active.has(button.dataset.filter)));
    }
    const count = $('.filters__count');
    if (count) count.textContent = tests.length ? `${shown} of ${total} projects` : '';
    const clear = $('.filters__clear');
    if (clear) clear.hidden = !tests.length;
  }

  function setupFilters() {
    const bar = $('#filters');
    bar.innerHTML = '<span class="filters__label" aria-hidden="true">Works with</span>'
      + FILTERS.map(f => `<button class="chip filter chip--${f.key}" type="button" aria-pressed="false" data-filter="${f.key}" data-track="filter-${f.key}">${esc(f.label)}</button>`).join('')
      + '<span class="filters__status"><span class="filters__count" aria-live="polite"></span>'
      + '<button class="filters__clear" type="button" data-clear-filters data-track="filter-clear" hidden>Show all</button></span>';
    bar.hidden = false;
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-filter], [data-clear-filters]');
      if (!button) return;
      const key = button.dataset.filter;
      if (!key) active.clear();
      else if (active.has(key)) active.delete(key);
      else active.add(key);
      // in the order of the buttons, so the same choice always gives the same address
      const query = FILTERS.filter(f => active.has(f.key)).map(f => f.key).join(',');
      history.replaceState(null, '', location.pathname + (query ? `?with=${query}` : '') + location.hash);
      applyFilters();
    });
  }

  /* ---------- rendering ---------- */

  const listedAsSoon = repo => comingSoon.some(name => name.toLowerCase() === repo.toLowerCase());

  function render() {
    // until the live data says otherwise
    for (const p of projects) p.comingSoon = listedAsSoon(p.repo);
    $('#collage').innerHTML = collage();
    renderFeatured();
    $('#tools-grid').innerHTML = projects.filter(p => p.section === 'tools').map(card).join('');
    $('#games-grid').innerHTML = projects.filter(p => p.section === 'games').map(card).join('');
    renderExtras();
    renderStats();
  }

  function renderStats() {
    const all = projects.concat(extras);
    const totals = {
      projects: all.length,
      downloads: all.reduce((sum, p) => sum + (p.downloads || 0), 0),
      stars: all.reduce((sum, p) => sum + (p.stars || 0), 0),
    };
    for (const [key, value] of Object.entries(totals)) {
      $(`[data-stat="${key}"]`).textContent = numberFormat.format(value);
    }
  }

  // "More on GitHub": projects listed with section 'more' first, then the ones GitHub adds.
  function renderExtras() {
    const all = projects.filter(p => p.section === 'more').concat(extras);
    $('#more').hidden = all.length === 0;
    $('#more-grid').innerHTML = all.map(card).join('');
    applyFilters();
  }

  // Updates the numbers in place, so the cards and images are not rebuilt.
  function refresh(p) {
    for (const node of document.querySelectorAll(`[data-repo="${CSS.escape(p.repo)}"]`)) {
      const group = node.querySelector('.badges');
      if (group) group.outerHTML = badges(p);
      const meta = node.querySelector('.meta-row');
      const inMeta = meta && meta.querySelector('.badges');
      if (meta) meta.innerHTML = (inMeta ? inMeta.outerHTML : '') + metaRow(p);
      const text = node.querySelector('.card__text, .spotlight__text');
      if (text) {
        text.textContent = p.tagline || 'No description yet.';
        if (text.title) text.title = text.textContent;
      }
      const buttons = node.querySelector('.actions');
      if (buttons) buttons.innerHTML = actions(p, { github: node.classList.contains('spotlight'), compact: buttons.classList.contains('actions--compact') });
    }
  }

  /* ---------- live data from GitHub ---------- */

  async function getJSON(url) {
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`${response.status} for ${url}`);
    return response.json();
  }

  // The first sentence of a release's notes as plain text, shortened to 180 characters.
  function firstSentence(markdown) {
    const plain = line => line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>|[*`~]|__/g, '')
      .trim();
    // headings, quotes, tables, rules and code fences carry no sentence
    const skip = line => /^(#|>|\||-{3,}|```)/.test(line);
    const item = /^([-*+]|\d+\.)\s+/;
    let text = '';
    for (const raw of (markdown || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (text) {
        // the notes wrap their lines: a paragraph or list item goes on until a blank line or the next item
        if (!line || item.test(line) || skip(line)) break;
        text += ' ' + plain(line);
      } else if (line && !skip(line)) {
        text = plain(line.replace(item, ''));
      }
    }
    if (!text) return null;
    const sentence = (text.match(/^.+?[.!?](?=\s|$)/) || [text])[0];
    return sentence.length > 180 ? sentence.slice(0, 179).replace(/\s+\S*$/, '') + '…' : sentence;
  }

  // What GitHub puts in a new repository; a repository with nothing else is still empty.
  const STARTER_FILES = new Set(['readme.md', 'readme', 'license', 'license.md', 'license.txt', '.gitignore', '.gitattributes']);

  // true when the repository holds only starter files (or no commit at all), null when unknown
  async function isEmpty(name) {
    const response = await fetch(`${API}/repos/${user}/${name}/contents/`, { headers: { Accept: 'application/vnd.github+json' } }).catch(() => null);
    if (!response) return null;
    if (response.status === 404) return true;
    if (!response.ok) return null;
    return (await response.json()).every(file => STARTER_FILES.has(file.name.toLowerCase()));
  }

  async function fetchLive() {
    const skip = new Set([`${user}.github.io`, user].map(name => name.toLowerCase()));
    const repos = (await getJSON(`${API}/users/${user}/repos?per_page=100&sort=pushed`))
      .filter(r => !r.fork && !r.archived && !skip.has(r.name.toLowerCase()));
    let complete = true;
    const live = await Promise.all(repos.map(async r => {
      const releases = await getJSON(`${API}/repos/${user}/${r.name}/releases?per_page=100`).catch(() => null);
      if (!releases) complete = false;
      const stable = releases && releases.find(rel => !rel.draft && !rel.prerelease);
      // a pre-release counts when it is newer than the latest stable release
      const newest = releases && releases.find(rel => !rel.draft);
      const published = releases ? releases.filter(rel => !rel.draft).map(rel => rel.published_at).sort() : [];
      // only asked for repositories that have no release yet
      const empty = releases && !releases.length ? await isEmpty(r.name) : false;
      return {
        name: r.name,
        description: r.description,
        topics: r.topics || [],
        stars: r.stargazers_count,
        pushed: r.pushed_at,
        version: stable ? stable.tag_name : null,
        released: stable ? stable.published_at : null,
        firstReleased: published[0] || null,
        pre: newest && newest.prerelease ? { version: newest.tag_name, released: newest.published_at } : null,
        // "What's new" in the Featured box: from the newest release, a pre-release too
        notes: newest ? firstSentence(newest.body) : null,
        // null means "unknown", so a failed request never shows 0 downloads
        downloads: releases && releases.reduce((sum, rel) => sum + rel.assets.reduce((n, a) => n + a.download_count, 0), 0),
        // null when GitHub did not answer, so a failed request never hides the download button
        hasReleases: releases ? releases.some(rel => !rel.draft) : null,
        empty,
      };
    }));
    return { live, complete };
  }

  function applyLive(live) {
    const byName = new Map(live.map(l => [l.name.toLowerCase(), l]));
    for (const p of projects) {
      const l = byName.get(p.repo.toLowerCase());
      if (!l) continue;
      // the short description from the repository's About box on GitHub
      if (l.description) p.tagline = l.description;
      p.stars = l.stars;
      p.updated = l.pushed;
      if (l.downloads != null) p.downloads = l.downloads;
      if (l.version) p.version = l.version;
      p.released = l.released;
      p.firstReleased = l.firstReleased;
      p.pre = l.pre;
      p.notes = l.notes;
      // only pre-releases so far: GitHub's "latest" link would find nothing
      if (l.pre && !l.version && p.download === undefined) p.download = `${repoUrl(p.repo)}/releases/tag/${encodeURIComponent(l.pre.version)}`;
      if (l.hasReleases === false && p.download === undefined) p.download = false;
      p.comingSoon = l.hasReleases === false && (l.empty === true || listedAsSoon(p.repo));
      refresh(p);
    }

    const known = new Set(projects.map(p => p.repo.toLowerCase()));
    extras = live
      .filter(l => !known.has(l.name.toLowerCase()))
      .sort((a, b) => b.pushed.localeCompare(a.pushed))
      .map(l => ({
        repo: l.name,
        name: l.name.replace(/[-_]+/g, ' '),
        tagline: l.description,
        platforms: l.topics.filter(t => PLATFORM_TOPICS[t]).map(t => PLATFORM_TOPICS[t]),
        stars: l.stars,
        downloads: l.downloads,
        updated: l.pushed,
        version: l.version,
        released: l.released,
        firstReleased: l.firstReleased,
        pre: l.pre,
        notes: l.notes,
        download: l.hasReleases === false ? false
          : l.pre && !l.version ? `${repoUrl(l.name)}/releases/tag/${encodeURIComponent(l.pre.version)}` : undefined,
        comingSoon: l.hasReleases === false && (l.empty === true || listedAsSoon(l.name)),
      }));
    renderExtras();
    renderStats();
    renderFeatured();
  }

  // short fingerprint of a text
  function stamp(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
    return hash.toString(36);
  }

  async function loadLive() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && cached.site === SITE_STAMP && Date.now() - cached.time < CACHE_TTL) return applyLive(cached.live);
    } catch (e) { /* no storage, fetch instead */ }

    const { live, complete } = await fetchLive();
    applyLive(live);
    if (complete) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), site: SITE_STAMP, live })); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- page chrome ---------- */

  function setupTheme() {
    const toggle = $('#theme-toggle');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const apply = (theme, save) => {
      document.documentElement.dataset.theme = theme;
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      themeColor.content = theme === 'dark' ? '#0b0a12' : '#f5f6f8';
      if (save) {
        try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }
      }
    };
    apply(document.documentElement.dataset.theme, false);
    toggle.addEventListener('click', () => apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));
  }

  // One shared dialog shows any picture that has a data-full attribute at full size.
  function setupLightbox() {
    const dialog = $('#lightbox');
    const img = dialog.querySelector('img');
    const caption = dialog.querySelector('.lightbox__caption');
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-full]');
      if (!trigger) return;
      // Sized up front from the known dimensions, fitted to the window, so the dialog does
      // not jump while the picture loads. Without a size the CSS limits alone apply.
      const [w, h] = (trigger.dataset.size || '').split('x').map(Number);
      const fit = w && h ? Math.min(1, (innerWidth * 0.94 - 2) / w, (innerHeight * 0.94 - 58) / h) : 0;
      img.style.width = fit ? Math.floor(w * fit) + 'px' : '';
      img.style.height = fit ? Math.floor(h * fit) + 'px' : '';
      img.src = trigger.dataset.full;
      img.alt = trigger.querySelector('img')?.alt || '';
      caption.textContent = trigger.dataset.caption || '';
      dialog.showModal();
    });
    // a click on the dimmed backdrop lands on the dialog element itself
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => img.removeAttribute('src'));
  }

  // Visitor statistics with Umami: no cookies, nothing that identifies a visitor (see
  // privacy.html). Clicks on anything marked with data-track count as events named after
  // the action ("download", "scene", ...), with the project as a property where there is one.
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
      if (!el || !window.umami) return;
      const project = el.dataset.project || el.closest('[data-repo]')?.dataset.repo;
      window.umami.track(el.dataset.track, project ? { project } : undefined);
    });
  }

  // Highlights the nav link of the section currently on screen.
  function setupNav() {
    const links = new Map([...document.querySelectorAll('.nav a')].map(a => [a.hash.slice(1), a]));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const [id, a] of links) a.classList.toggle('is-active', id === entry.target.id);
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    // every section is watched, so the hero clears the highlight again
    for (const section of document.querySelectorAll('main > section')) observer.observe(section);
  }

  // Get started: each step's demo window sits above its card (below it when the header would
  // cover it), moved sideways so it stays on screen, with its arrow on the step number.
  function setupDemos() {
    const steps = [...document.querySelectorAll('.steps > li')].filter(step => step.querySelector('.demo'));
    const header = $('.topbar');
    const place = () => {
      // the screenshot demos are laid out 376px wide and shrink with a narrower popover
      for (const shot of document.querySelectorAll('.demo__window--shot')) {
        shot.style.setProperty('--demo-fit', Math.min(1, shot.clientWidth / 376).toFixed(4));
      }
      const screen = document.documentElement.clientWidth;
      const top = (header ? header.getBoundingClientRect().bottom : 0) + 8;
      for (const step of steps) {
        const demo = step.querySelector('.demo');
        const card = step.getBoundingClientRect();
        const number = step.querySelector('.steps__n').getBoundingClientRect();
        const arrow = number.left + number.width / 2;
        const left = Math.min(Math.max(16, arrow - 43), screen - 16 - demo.offsetWidth);
        demo.style.setProperty('--demo-left', `${Math.round(left - card.left)}px`);
        demo.style.setProperty('--demo-arrow', `${Math.round(arrow - left)}px`);
        demo.classList.toggle('demo--below', card.top - demo.offsetHeight - 14 < top);
      }
    };
    place();
    window.addEventListener('resize', place);
    for (const step of steps) {
      step.addEventListener('pointerenter', place);
      step.addEventListener('focusin', place);
    }
  }

  setupFilters();
  render();
  setupTheme();
  setupNav();
  setupDemos();
  setupLightbox();
  setupStats();
  $('#year').textContent = new Date().getFullYear();
  // The Featured box stays hidden until the releases and the download history are in (or failed),
  // so it does not switch projects in front of the visitor; after 4 seconds it shows what it has.
  const reveal = () => $('#spotlight').classList.remove('is-pending');
  const shown = setTimeout(reveal, 4000);
  Promise.allSettled([
    loadLive().catch(() => { /* keep the numbers from projects.js */ }),
    loadHistory().catch(() => { /* no download history: releases and status changes only */ }),
  ]).then(() => {
    renderFeatured();
    clearTimeout(shown);
    reveal();
  });
})();
