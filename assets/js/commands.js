/*
 * The commands page (commands/): the filter above the list, the "On my panel" tick boxes, and the
 * Twitch panel made from what is ticked: a text for the panel's description and a picture for its
 * image, both made here in the browser. The list itself is in the page, written by
 * _tools/update-pages.js from the import strings. What is ticked is remembered in this browser only.
 */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // lower case, without accents, as in search.js
  const norm = text => String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const groups = $$('.cmd-group');
  const aside = $('#panel');
  if (!groups.length || !aside) return;
  const STORE = 'commands-panel';
  const CREDIT = 'Free Streamer.bot extensions by [aaskjer](https://aaskjer.github.io/)';
  // until the visitor picks something, the panel holds the chat games
  const GAMES = new Set(((window.SITE || {}).projects || []).filter(p => p.section === 'games').map(p => p.repo));

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE)); } catch (e) { /* nothing saved */ }
  const state = {
    title: saved && typeof saved.title === 'string' ? saved.title : 'Chat games',
    credit: !saved || saved.credit !== false,
  };

  /* ---------- the tick boxes ---------- */

  // each project's switch, and a box on every command everyone may use
  for (const g of groups) {
    const name = $('h2', g).textContent.trim();
    $('.cmd-group__head', g).insertAdjacentHTML('beforeend',
      `<label class="cmd-group__pick"><input type="checkbox" data-track="panel-project"> On my panel<span class="sr-only">: ${esc(name)}</span></label>`);
    for (const li of $$('li[data-panel]', g)) {
      li.insertAdjacentHTML('afterbegin', `<label class="cmd__pick"><input type="checkbox"><span class="sr-only">${esc(li.dataset.trigger)} on my panel</span></label>`);
    }
  }
  const boxesOf = g => $$('li[data-panel]', g).map(li => ({ li, box: $('.cmd__pick input', li) }));
  const switchOf = g => $('.cmd-group__pick input', g);

  function setDefaults(g, on) {
    const rows = boxesOf(g);
    const picks = rows.filter(r => r.li.dataset.panel === 'pick');
    for (const r of rows) r.box.checked = on && (picks.length ? picks.includes(r) : r === rows[0]);
  }

  function sync(g) {
    const on = boxesOf(g).some(r => r.box.checked);
    switchOf(g).checked = on;
    g.classList.toggle('is-on', on);
  }

  for (const g of groups) {
    const picks = saved && saved.picks ? saved.picks[g.dataset.repo] || [] : null;
    if (picks) for (const r of boxesOf(g)) r.box.checked = picks.includes(r.li.dataset.trigger);
    else setDefaults(g, GAMES.has(g.dataset.repo));
    // a project whose commands nobody but mods may use has nothing for viewers
    if (!boxesOf(g).length) switchOf(g).closest('label').hidden = true;
    sync(g);
    switchOf(g).addEventListener('change', event => { setDefaults(g, event.target.checked); sync(g); update(); });
    for (const r of boxesOf(g)) r.box.addEventListener('change', () => { sync(g); update(); });
  }

  /* ---------- the filter ---------- */

  const filter = $('.cmds__filter');
  const input = $('#cmd-filter');
  const empty = $('.cmds__empty');
  filter.hidden = false;
  input.addEventListener('input', () => {
    const words = norm(input.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const g of groups) {
      const project = norm(`${$('h2', g).textContent} ${g.dataset.short}`);
      for (const li of $$('.cmd', g)) {
        const text = `${project} ${norm(li.textContent)}`;
        li.hidden = !words.every(word => text.includes(word));
      }
      for (const list of $$('.cmd-group__rows', g)) {
        list.hidden = !$$('.cmd', list).some(li => !li.hidden);
        const label = list.previousElementSibling;
        if (label && label.classList.contains('cmd-group__sub')) label.hidden = list.hidden;
      }
      const count = $$('.cmd', g).filter(li => !li.hidden).length;
      g.hidden = !count;
      shown += count;
    }
    empty.hidden = shown > 0;
    empty.textContent = `No command matches “${input.value.trim()}”.`;
  });

  /* ---------- the panel ---------- */

  aside.innerHTML = `
    <div class="panel-builder__box">
      <div>
        <h2 class="panel-builder__title" id="panel-title">Twitch panel builder</h2>
        <p class="panel-builder__count" aria-live="polite"></p>
      </div>
      <div class="panel-builder__field">
        <label for="panel-name">Panel title</label>
        <input class="input" id="panel-name" maxlength="40" autocomplete="off" spellcheck="false">
      </div>
      <figure class="panel-builder__picture">
        <canvas width="640" height="240" role="img" aria-label="The panel as a picture"></canvas>
        <figcaption>The picture, for the panel's image</figcaption>
      </figure>
      <div class="panel-builder__field">
        <label for="panel-text">The text, for the panel's description</label>
        <textarea class="input" id="panel-text" rows="6" readonly></textarea>
      </div>
      <label class="check"><input type="checkbox" id="panel-credit"> A line with a link to this site</label>
      <div class="panel-builder__actions">
        <button class="btn btn--primary" type="button" id="panel-copy" data-track="panel-copy">Copy text</button>
        <button class="btn btn--ghost" type="button" id="panel-image" data-track="panel-image">Download picture</button>
      </div>
      <p class="panel-builder__note">Made in your browser; nothing is uploaded. On Twitch: your channel's <b>About</b> page, <b>Edit Panels</b>, <b>Add a Text or Image Panel</b>. Paste the text into its description, or upload the picture as its image.</p>
    </div>`;
  aside.hidden = false;
  const jump = $('.page-head__jump');
  if (jump) jump.hidden = false;

  const title = $('#panel-name', aside);
  const text = $('#panel-text', aside);
  const credit = $('#panel-credit', aside);
  const count = $('.panel-builder__count', aside);
  const canvas = $('canvas', aside);
  const copy = $('#panel-copy', aside);
  title.value = state.title;
  credit.checked = state.credit;
  title.addEventListener('input', () => { state.title = title.value; update(); });
  credit.addEventListener('change', () => { state.credit = credit.checked; update(); });

  // the ticked commands by project, the one that starts the game first
  function chosen() {
    return groups.map(g => ({
      repo: g.dataset.repo,
      short: g.dataset.short,
      commands: boxesOf(g).filter(r => r.box.checked)
        .sort((a, b) => ('start' in b.li.dataset) - ('start' in a.li.dataset))
        .map(r => r.li.dataset.trigger),
    })).filter(x => x.commands.length);
  }

  function save(list) {
    const picks = Object.fromEntries(list.map(x => [x.repo, x.commands]));
    try { localStorage.setItem(STORE, JSON.stringify({ title: state.title, credit: state.credit, picks })); } catch (e) { /* ignore */ }
  }

  // `store`: after the visitor changed something, so a first visit keeps following the defaults
  function update(store = true) {
    const list = chosen();
    count.textContent = `${list.length || 'No'} project${list.length === 1 ? '' : 's'} · changes as you tick them`;
    // Twitch reads the description as Markdown: a list keeps one project per line
    text.value = list.map(x => `- **${x.short}**: ${x.commands.join(' · ')}`).join('\n')
      + (state.credit && list.length ? `\n\n${CREDIT}` : '');
    copy.disabled = !list.length;
    draw(list);
    if (store) save(list);
  }

  /* ---------- the picture ---------- */

  const W = 320;
  const SCALE = 2;
  const PAD = 16;
  const HEAD = 50;
  const FONTS = {
    title: '700 18px Sora, system-ui, sans-serif',
    name: '600 14px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    command: '500 12px ui-monospace, "Cascadia Code", Consolas, monospace',
    small: '400 11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  };
  const ctx = canvas.getContext('2d');

  // the commands of a project in lines that fit the panel, "!a · !b" broken between commands
  function lines(commands, width) {
    ctx.font = FONTS.command;
    const out = [];
    let line = '';
    for (const command of commands) {
      const next = line ? `${line} · ${command}` : command;
      if (line && ctx.measureText(next).width > width) {
        out.push(line);
        line = command;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
    return out;
  }

  function fit(textLine, font, width) {
    ctx.font = font;
    if (ctx.measureText(textLine).width <= width) return textLine;
    let cut = textLine;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  }

  function draw(list) {
    const blocks = list.map(x => ({ name: x.short, lines: lines(x.commands, W - PAD * 2) }));
    let height = HEAD + 14 + (blocks.length ? blocks.reduce((h, b) => h + 18 + b.lines.length * 17 + 10, -10) : 18);
    if (state.credit && blocks.length) height += 30;
    height = Math.ceil(height + 16);
    canvas.width = W * SCALE;
    canvas.height = height * SCALE;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = '#15131f';
    ctx.fillRect(0, 0, W, height);
    const grad = ctx.createLinearGradient(0, 0, W, HEAD);
    grad.addColorStop(0, '#7c3aed');
    grad.addColorStop(0.55, '#4f46e5');
    grad.addColorStop(1, '#2563eb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, HEAD);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fit(state.title.trim() || 'Chat games', FONTS.title, W - PAD * 2), PAD, HEAD / 2 + 1);

    let y = HEAD + 14;
    ctx.textBaseline = 'top';
    if (!blocks.length) {
      ctx.font = FONTS.small;
      ctx.fillStyle = '#a6a2bb';
      ctx.fillText('Tick “On my panel” next to a project.', PAD, y + 2);
    }
    for (const b of blocks) {
      ctx.font = FONTS.name;
      ctx.fillStyle = '#eeedf7';
      ctx.fillText(fit(b.name, FONTS.name, W - PAD * 2), PAD, y);
      y += 18;
      ctx.font = FONTS.command;
      ctx.fillStyle = '#c4b5fd';
      for (const line of b.lines) {
        ctx.fillText(line, PAD, y);
        y += 17;
      }
      y += 10;
    }
    if (state.credit && blocks.length) {
      y += 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(PAD, y, W - PAD * 2, 1);
      ctx.font = FONTS.small;
      ctx.fillStyle = '#a6a2bb';
      ctx.fillText('Free Streamer.bot extensions by aaskjer.github.io', PAD, y + 10);
    }
    canvas.style.aspectRatio = `${W} / ${height}`;
  }

  /* ---------- copy and download ---------- */

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text.value);
    } catch (e) {
      text.select();
      document.execCommand('copy');
    }
    copy.textContent = 'Copied';
    setTimeout(() => { copy.textContent = 'Copy text'; }, 1600);
  });

  $('#panel-image', aside).addEventListener('click', () => {
    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'twitch-panel.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  });

  update(false);
  // the title in Sora once the font is there
  if (document.fonts) document.fonts.load(FONTS.title).then(() => draw(chosen()), () => {});
})();
