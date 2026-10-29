// The project pages moved from /<folder>/ to /projects/<folder>/. GitHub Pages cannot redirect,
// so an old link lands on 404.html, and this sends it on to the new address with its tab and
// heading, before the error page is drawn.
(function () {
  var old = location.pathname.match(/^\/([a-z0-9-]+)(?:\/(?:index\.html)?)?$/);
  if (!old || !window.SITE) return;
  var page = 'projects/' + old[1] + '/';
  var known = window.SITE.projects.some(function (p) { return p.page === page; });
  if (known) location.replace('/' + page + location.search + location.hash);
})();
