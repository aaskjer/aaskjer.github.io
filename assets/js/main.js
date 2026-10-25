/*
 * Renders the projects from projects.js and refreshes their numbers
 * (stars, downloads, latest version, last update) from the GitHub API.
 */
(() => {
  'use strict';

  const { user, twitch, stats, projects } = window.SITE;
  const API = 'https://api.github.com';
  const CACHE_KEY = 'github-live-v1';
  // GitHub allows 60 requests per hour without a token, so one visit's
  // answers are kept for an hour.
  const CACHE_TTL = 60 * 60 * 1000;
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

  function chips(p) {
    const platforms = p.platforms || [];
    const shown = platforms.length > 4 ? platforms.slice(0, 3) : platforms;
    const rest = platforms.slice(shown.length);
    const items = shown.map(name => `<li class="chip chip--${slug(name)}">${esc(name)}</li>`);
    if (rest.length) {
      items.push(`<li class="chip chip--more" title="${esc(rest.join(', '))}">+${rest.length} more<span class="sr-only">: ${esc(rest.join(', '))}</span></li>`);
    }
    for (const tag of p.tags || []) items.push(`<li class="chip chip--tag">${esc(tag)}</li>`);
    return items.length ? `<ul class="chips" aria-label="Works with">${items.join('')}</ul>` : '';
  }

  function metaRow(p) {
    const items = [`<span class="meta" title="GitHub stars">${icon('star')}${numberFormat.format(p.stars || 0)}<span class="sr-only"> stars</span></span>`];
    if (p.downloads) {
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

  function actions(p, { github = false } = {}) {
    const url = repoUrl(p.repo);
    const links = [];
    if (p.download !== false) {
      links.push(`<a class="btn btn--primary btn--sm" href="${esc(p.download || `${url}/releases/latest`)}" data-track="download">${icon('download')}${esc(p.downloadLabel || 'Download')}</a>`);
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

  const STATUS = {
    dev: { label: 'In development', note: 'Actively worked on: new features and changes are still coming.' },
    complete: { label: 'Complete', note: 'Finished: no big updates planned, only fixes.' },
  };

  // Version and status side by side, e.g. "v16.1.1" and a yellow "In development".
  function badges(p) {
    const status = STATUS[p.status];
    let note = status ? status.note : '';
    if (p.status === 'complete' && p.section === 'games') {
      note += ' The games get one more round if Streamer.bot ships its own points system.';
    }
    const label = status ? `<span class="badge badge--${p.status}" title="${esc(note)}">${status.label}</span>` : '';
    return `<span class="badges">${badge(p)}${label}</span>`;
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

  function card(p) {
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
        <p class="card__text">${esc(p.tagline || 'No description yet.')}</p>
        ${chips(p)}
        <div class="card__foot">
          <div class="meta-row">${metaRow(p)}</div>
          <div class="actions">${actions(p)}</div>
        </div>
      </article>`;
  }

  function spotlight(p) {
    return `
      <article class="spotlight" data-repo="${esc(p.repo)}">
        <div class="spotlight__body">
          <div class="card__head">
            ${logoTile(p)}
            <div class="card__heading">
              <p class="kicker">Featured</p>
              <h3 class="spotlight__title"><a href="${esc(projectUrl(p))}" data-track="${p.page ? 'project' : 'repo'}">${esc(p.name || p.repo)}</a></h3>
            </div>
          </div>
          <p class="spotlight__text">${esc(p.tagline)}</p>
          <ul class="features">
            ${(p.features || []).map(f => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}
          </ul>
          ${chips(p)}
          <div class="spotlight__foot">
            <div class="meta-row">${badges(p)}${metaRow(p)}</div>
            <div class="actions">${actions(p, { github: true })}</div>
          </div>
        </div>
        ${p.screenshot ? `
        <figure class="spotlight__shot">
          <div class="window-bar" aria-hidden="true"><span></span><span></span><span></span></div>
          <button class="shot-zoom" type="button" data-track="scene" data-full="${esc(p.screenshotFull || p.screenshot)}" data-size="${p.screenshotFull ? '940x1461' : '940x640'}"
                  data-caption="${esc(p.name)} · settings window" aria-label="Show the whole ${esc(p.name)} settings window">
            <img src="${esc(p.screenshot)}" alt="The ${esc(p.name)} settings window" width="940" height="640" loading="lazy" decoding="async">
            <span class="zoom">${icon('expand')}</span>
          </button>
        </figure>` : ''}
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

  /* ---------- rendering ---------- */

  function render() {
    const featured = projects.find(p => p.featured);
    $('#collage').innerHTML = collage();
    $('#spotlight').innerHTML = featured ? spotlight(featured) : '';
    $('#tools-grid').innerHTML = projects.filter(p => p.section === 'tools' && p !== featured).map(card).join('');
    $('#games-grid').innerHTML = projects.filter(p => p.section === 'games' && p !== featured).map(card).join('');
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

  function renderExtras() {
    $('#more').hidden = extras.length === 0;
    $('#more-grid').innerHTML = extras.map(card).join('');
  }

  // Updates the numbers in place, so the cards and images are not rebuilt.
  function refresh(p) {
    for (const node of document.querySelectorAll(`[data-repo="${CSS.escape(p.repo)}"]`)) {
      const badgeEl = node.querySelector('.badge');
      if (badgeEl) {
        badgeEl.textContent = p.version || '';
        badgeEl.hidden = !p.version;
      }
      const meta = node.querySelector('.meta-row');
      const group = meta && meta.querySelector('.badges');
      if (meta) meta.innerHTML = (group ? group.outerHTML : '') + metaRow(p);
    }
  }

  /* ---------- live data from GitHub ---------- */

  async function getJSON(url) {
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`${response.status} for ${url}`);
    return response.json();
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
      return {
        name: r.name,
        description: r.description,
        topics: r.topics || [],
        stars: r.stargazers_count,
        pushed: r.pushed_at,
        version: stable ? stable.tag_name : null,
        // null means "unknown", so a failed request never shows 0 downloads
        downloads: releases && releases.reduce((sum, rel) => sum + rel.assets.reduce((n, a) => n + a.download_count, 0), 0),
        hasReleases: Boolean(releases && releases.some(rel => !rel.draft)),
      };
    }));
    return { live, complete };
  }

  function applyLive(live) {
    const byName = new Map(live.map(l => [l.name.toLowerCase(), l]));
    for (const p of projects) {
      const l = byName.get(p.repo.toLowerCase());
      if (!l) continue;
      p.stars = l.stars;
      p.updated = l.pushed;
      if (l.downloads != null) p.downloads = l.downloads;
      if (l.version) p.version = l.version;
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
        download: l.hasReleases ? undefined : false,
      }));
    renderExtras();
    renderStats();
  }

  async function loadLive() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.time < CACHE_TTL) return applyLive(cached.live);
    } catch (e) { /* no storage, fetch instead */ }

    const { live, complete } = await fetchLive();
    applyLive(live);
    if (complete) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), live })); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- page chrome ---------- */

  function setupTheme() {
    const toggle = $('#theme-toggle');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const apply = (theme, save) => {
      document.documentElement.dataset.theme = theme;
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      themeColor.content = theme === 'dark' ? '#0b0a12' : '#f6f5fb';
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

  render();
  setupTheme();
  setupNav();
  setupLightbox();
  setupStats();
  $('#year').textContent = new Date().getFullYear();
  loadLive().catch(() => { /* keep the numbers from projects.js */ });
})();
