/*
 * Renders the projects from projects.js and refreshes their numbers
 * (stars, downloads, latest version, last update) from the GitHub API.
 */
(() => {
  'use strict';

  const { user, projects } = window.SITE;
  const API = 'https://api.github.com';
  const CACHE_KEY = 'github-live-v1';
  // GitHub allows 60 requests per hour without a token, so one visit's
  // answers are kept for an hour.
  const CACHE_TTL = 60 * 60 * 1000;
  const PLATFORM_TOPICS = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', discord: 'Discord', obs: 'OBS' };

  const $ = sel => document.querySelector(sel);
  const repoUrl = repo => `https://github.com/${user}/${repo}`;
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

  function actions(p, { github = false } = {}) {
    const url = repoUrl(p.repo);
    const links = [];
    if (p.download !== false) {
      links.push(`<a class="btn btn--primary btn--sm" href="${esc(p.download || `${url}/releases/latest`)}">${icon('download')}${esc(p.downloadLabel || 'Download')}</a>`);
    }
    if (p.guide) {
      const href = /^https?:/.test(p.guide.href) ? p.guide.href : `${url}/blob/main/${p.guide.href}`;
      links.push(`<a class="btn btn--ghost btn--sm" href="${esc(href)}">${icon('book')}${esc(p.guide.label)}</a>`);
    }
    if (github || !links.length) {
      links.push(`<a class="btn btn--ghost btn--sm" href="${url}">${icon('github')}GitHub</a>`);
    }
    return links.join('');
  }

  function badge(p) {
    return `<span class="badge"${p.version ? '' : ' hidden'}>${esc(p.version || '')}</span>`;
  }

  function card(p) {
    return `
      <article class="card" data-repo="${esc(p.repo)}">
        <div class="card__head">
          ${logoTile(p)}
          <div class="card__heading">
            <h3 class="card__title"><a href="${repoUrl(p.repo)}">${esc(p.name || p.repo)}</a></h3>
            ${badge(p)}
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
              <h3 class="spotlight__title"><a href="${repoUrl(p.repo)}">${esc(p.name || p.repo)}</a></h3>
            </div>
          </div>
          <p class="spotlight__text">${esc(p.tagline)}</p>
          <ul class="features">
            ${(p.features || []).map(f => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}
          </ul>
          ${chips(p)}
          <div class="spotlight__foot">
            <div class="meta-row">${badge(p)}${metaRow(p)}</div>
            <div class="actions">${actions(p, { github: true })}</div>
          </div>
        </div>
        ${p.screenshot ? `
        <figure class="spotlight__shot">
          <div class="window-bar" aria-hidden="true"><span></span><span></span><span></span></div>
          <img src="${esc(p.screenshot)}" alt="The ${esc(p.name)} settings window" width="940" height="640" loading="lazy" decoding="async">
        </figure>` : ''}
      </article>`;
  }

  function collage() {
    const tiles = projects.filter(p => p.logo).slice(0, 8).map((p, i) =>
      `<a class="collage__tile" style="--i:${i}" href="${repoUrl(p.repo)}" tabindex="-1"><img src="${esc(p.logo)}" alt=""></a>`);
    tiles.splice(4, 0, '<div class="collage__tile collage__tile--me" style="--i:4"><img src="assets/img/avatar.png" alt=""></div>');
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
      if (meta) meta.innerHTML = (meta.contains(badgeEl) ? badgeEl.outerHTML : '') + metaRow(p);
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
  $('#year').textContent = new Date().getFullYear();
  loadLive().catch(() => { /* keep the numbers from projects.js */ });
})();
