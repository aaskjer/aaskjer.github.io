/*
 * The playground on a game's project page (the "Try it" tab): a stream chat to type into, and the
 * game's real OBS overlay beside it, driven by a copy of the game's rules in JavaScript instead of
 * Streamer.bot. Each game brings its rules in assets/js/playground/<page folder>.js, which adds
 * itself to window.PlaygroundGames; project.js loads both when the tab opens.
 *
 * A game's rules answer every chat line with frames: a chat message from the bot and the overlay's
 * state at that moment. They come out one after the other, with the pauses the game makes, so the
 * overlay deals and draws the way it does on stream.
 */
(() => {
  'use strict';

  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const VIEWER = 'viewer';
  const BOT = 'StreamBot';

  function mount(root, { game, overlay, name, track }) {
    root.innerHTML = `
      <section class="playground" aria-label="Try ${esc(name)} in your browser">
        <div class="playground__stage">
          <div class="playground__screen">
            <iframe class="playground__overlay" src="${esc(overlay)}" title="${esc(game.title)}" sandbox="allow-scripts" tabindex="-1"></iframe>
            <div class="playground__idle">
              <p class="playground__idle-title">${esc(game.idle[0])}</p>
              <p>${esc(game.idle[1])}</p>
            </div>
          </div>
          <p class="playground__live"><span>Live</span>OBS overlay · simulated</p>
        </div>
        <div class="playground__chat">
          <div class="playground__chat-head">
            <span>Stream chat</span>
            <button class="playground__reset" type="button" data-track="playground-reset">Start over</button>
          </div>
          <ol class="playground__log" aria-live="polite" aria-label="Chat messages"></ol>
          <form class="playground__send">
            <label class="sr-only" for="playground-input">Chat message</label>
            <input id="playground-input" class="input" autocomplete="off" spellcheck="false" maxlength="200" placeholder="Send a message as ${VIEWER}…">
            <button class="btn btn--primary btn--sm" type="submit">Send</button>
          </form>
          <div class="playground__quick" role="group" aria-label="Quick commands"></div>
        </div>
        <p class="playground__note">${game.note || ''} A simulation in your browser: nothing is sent anywhere. On stream the overlay is an OBS browser source and Streamer.bot sends it the game.</p>
      </section>`;

    const frame = root.querySelector('iframe');
    const log = root.querySelector('.playground__log');
    const input = root.querySelector('input');
    const quick = root.querySelector('.playground__quick');
    const idle = root.querySelector('.playground__idle');
    let ready = false;
    let shown = { active: false };
    const queue = [];
    let playing = false;
    let started = false;

    function show(state) {
      shown = state;
      idle.hidden = !!state.active;
      if (ready) frame.contentWindow.postMessage({ type: 'playground-state', hook: game.hook, state }, '*');
    }

    addEventListener('message', event => {
      if (event.source !== frame.contentWindow || !event.data || event.data.type !== 'playground-ready') return;
      ready = true;
      show(shown);
    });

    function line(user, text, kind) {
      const li = document.createElement('li');
      li.className = `playground__line playground__line--${kind}`;
      li.innerHTML = kind === 'note' ? esc(text) : `<b>${esc(user)}</b> ${esc(text)}`;
      log.appendChild(li);
      // the newest lines in view, without moving the page
      log.scrollTop = log.scrollHeight;
    }

    function refreshQuick() {
      quick.innerHTML = '<span class="playground__quick-label">Try</span>' + game.quick(engine).map(command =>
        `<button class="playground__cmd" type="button" data-command="${esc(command)}">${esc(command)}</button>`).join('');
    }

    // the frames one after the other, each after its pause
    function play() {
      if (playing) return;
      const next = queue.shift();
      if (!next) { refreshQuick(); return; }
      playing = true;
      setTimeout(() => {
        playing = false;
        if (next.text) for (const part of next.text.split('\n')) line(BOT, part, 'bot');
        if (next.note) line('', next.note, 'note');
        if (next.state) show(next.state);
        play();
      }, next.delay);
    }

    const engine = game.create({
      // a chat message from the bot, then the overlay as it is now
      say(text, delay = 350) { queue.push({ text, state: engine.overlay(), delay }); play(); },
      // a line from the playground itself, not from the game
      note(text) { queue.push({ note: text, delay: 200 }); play(); },
      // the overlay alone, without a message
      draw(delay = 0) { queue.push({ state: engine.overlay(), delay }); play(); },
    });

    function send(text) {
      text = text.trim();
      if (!text) return;
      line(VIEWER, text, 'viewer');
      if (!started) {
        started = true;
        if (track && window.umami) window.umami.track('playground-start', { project: track });
      }
      engine.handle(VIEWER, text);
      play();
    }

    root.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      send(input.value);
      input.value = '';
    });
    quick.addEventListener('click', event => {
      const button = event.target.closest('[data-command]');
      if (button) send(button.dataset.command);
    });
    root.querySelector('.playground__reset').addEventListener('click', () => {
      queue.length = 0;
      engine.reset();
      log.innerHTML = '';
      show(engine.overlay());
      refreshQuick();
      line('', game.welcome, 'note');
    });

    line('', game.welcome, 'note');
    refreshQuick();
  }

  window.Playground = { mount };
})();
