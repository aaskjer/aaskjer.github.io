/*
 * Small celebrations: when downloads or GitHub stars pass a round number (50, 100, 200, 500,
 * 1,000, … downloads; 5, 10, 20, 50, … stars), the number gets a 🎉 chip for a week and each
 * visitor sees a burst of confetti from it once. A click on the chip throws the confetti again.
 * When a number passed a step comes from the daily counts on the stats branch
 * (.github/workflows/download-counts.yml) and the number now. main.js celebrates the totals on
 * the start page, project.js a project's own numbers.
 */
(() => {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;
  // how long a step passed is celebrated
  const FRESH = 7 * DAY;
  const FIRST = { stars: 5, downloads: 50 };
  const NOUN = { stars: ['stars', 'GitHub stars'], downloads: ['downloads', 'downloads'] };
  // the steps this visitor has seen the confetti for
  const SEEN_KEY = 'milestones-seen';
  const COLORS = ['#a78bfa', '#818cf8', '#38bdf8', '#34d399', '#fbbf24', '#f472b6'];
  const numberFormat = new Intl.NumberFormat('en');
  const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  // the highest of 1, 2, 5, 10, 20, 50, … from FIRST[kind] on above `before`, up to `after`
  function step(kind, before, after) {
    let found = 0;
    for (let base = 1; base <= after; base *= 10) {
      for (const n of [base, 2 * base, 5 * base]) {
        if (n >= FIRST[kind] && n > before && n <= after) found = n;
      }
    }
    return found;
  }

  // The newest step passed within the last week, between two daily counts or between the newest
  // count and the number now, and still not dropped below (stars can be taken back). A day
  // without a count (a repository newer than that day) is left out.
  function passed(kind, days, pick, now) {
    const points = Object.keys(days || {}).sort()
      .map(date => [Date.parse(date), pick(days[date])])
      .filter(point => point[1] != null);
    if (now != null) points.push([Date.now(), now]);
    const last = points.length ? points[points.length - 1][1] : 0;
    for (let i = points.length - 1; i > 0 && Date.now() - points[i][0] < FRESH; i--) {
      const n = step(kind, points[i - 1][1], points[i][1]);
      if (n) return n <= last ? { n, time: points[i][0] } : null;
    }
    return null;
  }

  // the steps whose confetti this visitor has seen; without storage it comes every visit
  function seen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch (e) { return []; }
  }

  function remember(id) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen().concat(id).slice(-50))); } catch (e) { /* no storage */ }
  }

  // Forty pieces flying up out of `from` and falling, on a layer above the page.
  function confetti(from) {
    if (calm.matches) return;
    const box = from.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.className = 'confetti';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    const flights = [];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('i');
      piece.style.left = `${box.left + box.width / 2}px`;
      piece.style.top = `${box.top + box.height / 2}px`;
      piece.style.background = COLORS[i % COLORS.length];
      layer.appendChild(piece);
      // mostly upwards, up to 100° to either side
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1 * Math.PI;
      const speed = 90 + Math.random() * 150;
      const x = Math.cos(angle) * speed;
      const y = Math.sin(angle) * speed;
      const spin = (Math.random() - 0.5) * 1080;
      flights.push(piece.animate([
        { transform: 'translate(-50%, -50%)', easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' },
        { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${spin / 2}deg)`, offset: 0.4, easing: 'cubic-bezier(0.5, 0, 0.8, 0.6)' },
        { transform: `translate(calc(-50% + ${x * 1.4}px), calc(-50% + ${y + 240}px)) rotate(${spin}deg)`, opacity: 0 },
      ], { duration: 1500 + Math.random() * 700, fill: 'forwards' }).finished);
    }
    Promise.all(flights).then(() => layer.remove());
  }

  // The first burst waits until the chip is on screen; two steps passed at once burst one
  // after the other.
  let nextBurst = 0;
  function burstWhenSeen(chip, id) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      remember(id);
      const wait = Math.max(0, nextBurst - Date.now());
      nextBurst = Date.now() + wait + 700;
      setTimeout(() => {
        chip.classList.add('milestone--new');
        confetti(chip);
      }, wait + 300);
    }, { threshold: 1 });
    observer.observe(chip);
  }

  // A chip for the newest step of `kind` passed within the week, put on the page by `place`.
  // `days` are the daily counts by date, `pick` reads the number from one day's counts, `now` is
  // the number on the page and `id` tells the counts apart ('all' or a repository). A `brief`
  // chip leaves out the noun, for a number that is labelled already.
  function celebrate({ id, kind, days, pick, now, place, brief = false }) {
    const hit = passed(kind, days, pick, now);
    if (!hit) return;
    const [short, long] = NOUN[kind];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'milestone';
    chip.dataset.track = 'milestone';
    chip.textContent = `🎉 ${numberFormat.format(hit.n)}${brief ? '' : ` ${short}`}!`;
    // a daily count stands for midnight (UTC) of its day
    const when = relativeFormat.format(-Math.floor((Date.now() - hit.time) / DAY), 'day');
    chip.title = `Passed ${numberFormat.format(hit.n)} ${long} ${when}. Thank you!`;
    chip.addEventListener('click', () => confetti(chip));
    place(chip);
    const key = `${id}:${kind}:${hit.n}`;
    if (!seen().includes(key)) burstWhenSeen(chip, key);
  }

  window.Milestones = { celebrate };
})();
