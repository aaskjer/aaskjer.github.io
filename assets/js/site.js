/*
 * What the commands page and the help page share: the theme switch, the visitor statistics and the
 * year in the footer, which main.js and project.js do on the start page and the project pages. On the
 * help page a link to one of the problems (help/#a-command-gets-no-answer-in-chat) opens it.
 */
(() => {
  'use strict';

  const SITE = window.SITE || {};

  const toggle = document.getElementById('theme-toggle');
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

  // Umami, as in main.js: no cookies; a click on anything with data-track counts as that event
  const stats = SITE.stats;
  if (stats && stats.websiteId) {
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

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  function openTarget() {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    const target = id && document.getElementById(id);
    if (target && target.tagName === 'DETAILS') {
      target.open = true;
      target.scrollIntoView();
    }
  }
  addEventListener('hashchange', openTarget);
  openTarget();
})();
