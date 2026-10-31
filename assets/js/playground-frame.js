/*
 * Runs inside a game's own OBS overlay when the playground on its project page shows it (an iframe
 * of its own, sandboxed, without the site's origin; _tools/update-pages.js puts this script into the
 * copy of the overlay). In a stream the overlay loads a state file the game writes, every few
 * hundred milliseconds. Here the playground sends the state instead, and nothing goes over the
 * network: the overlay's request for its state file is answered on the spot with the latest state.
 */
(() => {
  'use strict';

  let hook = null;
  let state = null;

  function deliver() {
    if (hook && state && typeof window[hook] === 'function') window[hook](state);
  }

  addEventListener('message', event => {
    const data = event.data;
    if (event.source !== parent || !data || data.type !== 'playground-state') return;
    hook = data.hook;
    state = data.state;
    deliver();
  });

  // the state file the overlay asks for, e.g. blackjack_state.js?t=…
  const STATE_FILE = /_state\.js(\?|$)/;
  const append = Node.prototype.appendChild;
  Node.prototype.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT' && STATE_FILE.test(node.getAttribute('src') || '')) {
      setTimeout(() => {
        deliver();
        if (typeof node.onload === 'function') node.onload();
      }, 0);
      return node;
    }
    return append.call(this, node);
  };

  parent.postMessage({ type: 'playground-ready' }, '*');
})();
