// Picks the theme before the first paint so the page never flashes. Loaded as a file
// rather than inline, so the Content-Security-Policy can forbid inline scripts.
(function () {
  var theme;
  try { theme = localStorage.getItem('theme'); } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = theme;
  // the browser's toolbar gets the page's background; on project pages the HTML holds the
  // status colour, which only link previews are meant to show
  var color = document.querySelector('meta[name="theme-color"]');
  if (color) color.content = theme === 'dark' ? '#0b0a12' : '#f5f6f8';
})();
