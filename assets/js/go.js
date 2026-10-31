// Opens a store page in the store's own launcher. Discord makes only http(s) links clickable, so
// GameCheck's embeds link here instead of to steam:// - /go/?steam=<appid> or /go/?epic=p/<slug> -
// and this page hands the link on. Only these two forms are accepted, each checked against a strict
// pattern, so the page can never send anyone to an address of someone else's choosing.
(function () {
  var STORES = {
    steam: {
      name: 'Steam',
      pattern: /^[1-9][0-9]{0,9}$/,
      app: function (id) { return 'steam://store/' + id; },
      web: function (id) { return 'https://store.steampowered.com/app/' + id + '/'; }
    },
    epic: {
      name: 'Epic Games Launcher',
      pattern: /^(p|bundles)\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,
      app: function (id) { return 'com.epicgames.launcher://store/' + id; },
      web: function (id) { return 'https://store.epicgames.com/' + id; }
    }
  };

  // The store and id from the address, or null.
  function target(search) {
    var params = new URLSearchParams(search);
    for (var key in STORES) {
      var id = params.get(key);
      if (id !== null && STORES[key].pattern.test(id)) {
        var store = STORES[key];
        return { name: store.name, app: store.app(id), web: store.web(id) };
      }
    }
    return null;
  }

  function show(id) { document.getElementById(id).hidden = false; }
  function text(id, value) { document.getElementById(id).textContent = value; }

  var found = target(location.search);
  if (!found) {
    text('launch-title', 'This link is not valid');
    text('launch-lead', 'It does not name a game in a store this page knows.');
    show('launch-home');
    return;
  }

  var title = document.getElementById('launch-title');
  title.textContent = 'Opening ';
  var name = document.createElement('span');
  name.className = 'grad';
  name.textContent = found.name;
  title.appendChild(name);
  text('launch-lead', 'The game opens in ' + found.name + ' on your computer.');
  text('launch-app', 'Open in ' + found.name);
  document.getElementById('launch-app').href = found.app;
  document.getElementById('launch-web').href = found.web;
  show('launch-cta');
  show('launch-hint');

  location.href = found.app;
})();
