/*
 * Runs inside a game's own OBS overlay when the playground on its project page shows it (an iframe
 * of its own, sandboxed, without the site's origin; _tools/update-pages.js puts this script into the
 * copy of the overlay). In a stream the overlay gets the game from Streamer.bot: it loads a state
 * file the game writes every few hundred milliseconds, or listens to Streamer.bot's WebSocket. Here
 * the playground sends the state instead, and nothing goes over the network: the overlay's request
 * for its state file is answered on the spot with the latest state, and its WebSocket is one that
 * only the playground talks into.
 */
(() => {
  'use strict';

  let hook = null;
  let state = null;

  // a state file read as a script, e.g. blackjack_state.js?t=…, which calls a function of the overlay
  const STATE_SCRIPT = /_state\.js(\?|$)/;
  // a state file read with fetch, e.g. hangman_state.json?t=…
  const STATE_FILE = /_state\.json(\?|$)/;

  function deliver() {
    if (hook && state && typeof window[hook] === 'function') window[hook](state);
  }

  const append = Node.prototype.appendChild;
  Node.prototype.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT' && STATE_SCRIPT.test(node.getAttribute('src') || '')) {
      setTimeout(() => {
        deliver();
        if (typeof node.onload === 'function') node.onload();
      }, 0);
      return node;
    }
    return append.call(this, node);
  };

  // Every other file the overlay asks for (a config file, itself to look for a newer version) is
  // not there, as on a PC that has none of it.
  window.fetch = input => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const found = STATE_FILE.test(url) && state;
    return Promise.resolve(found
      ? new Response(JSON.stringify(state), { status: 200, headers: { 'Content-Type': 'application/json' } })
      : new Response('', { status: 404 }));
  };

  /* Streamer.bot's WebSocket server, as far as an overlay needs it: it says hello without asking
     for a password, says yes to every request (subscriptions, and no stored globals to catch up
     on), and passes on each new state as the event the game would broadcast. */
  const sockets = new Set();
  let sent = null;

  class PlaygroundSocket extends EventTarget {
    constructor(url) {
      super();
      this.url = String(url);
      this.readyState = 0;
      this.onopen = this.onmessage = this.onclose = this.onerror = null;
      setTimeout(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        sockets.add(this);
        this.fire('open');
        this.receive({ request: 'Hello', info: { name: 'Streamer.bot', instanceId: 'playground' } });
        if (sent) this.receive(state);
      }, 0);
    }

    fire(type, extra) {
      const event = new Event(type);
      Object.assign(event, extra);
      if (typeof this[`on${type}`] === 'function') this[`on${type}`](event);
      this.dispatchEvent(event);
    }

    receive(message) {
      if (this.readyState === 1) this.fire('message', { data: JSON.stringify(message) });
    }

    send(text) {
      let request = null;
      try { request = JSON.parse(text); } catch (e) { return; }
      if (!request || !request.id) return;
      const reply = { id: request.id, status: 'ok' };
      if (request.request === 'GetGlobal') reply.variable = null;
      setTimeout(() => this.receive(reply), 0);
    }

    close() {
      if (this.readyState > 1) return;
      this.readyState = 3;
      sockets.delete(this);
      this.fire('close', { code: 1000, reason: '', wasClean: true });
    }
  }
  Object.assign(PlaygroundSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  window.WebSocket = PlaygroundSocket;

  // only a state that changed: on the socket each one is an event, and an event twice shows twice
  function broadcast() {
    const text = state ? JSON.stringify(state) : null;
    if (!text || text === sent) return;
    sent = text;
    for (const socket of sockets) socket.receive(state);
  }

  addEventListener('message', event => {
    const data = event.data;
    if (event.source !== parent || !data || data.type !== 'playground-state') return;
    hook = data.hook;
    state = data.state;
    deliver();
    broadcast();
  });

  parent.postMessage({ type: 'playground-ready' }, '*');
})();
