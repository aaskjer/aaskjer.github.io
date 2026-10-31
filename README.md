# aaskjer.github.io

Source of [aaskjer.github.io](https://aaskjer.github.io), the overview page for my Streamer.bot extensions.

Plain HTML, CSS and JavaScript, published by GitHub Pages straight from the `main` branch. There is no build step.

- `assets/js/projects.js` lists the projects; the start page and the project pages are built from it.
- Each project has its own page in `projects/`, in a folder named after it (`projects/blackjack-game/index.html` and so on). The page shows the project's README, setup guide, manual and FAQ from its repository and a changelog (its `CHANGELOG.md`, or else its release notes or commit history), and an install box with what its import string adds to Streamer.bot: the chat commands, the actions and the web services its C# code calls.
- The pages are not edited by hand: `node _tools/update-pages.js` writes all of them from `_tools/project-page.html` and the entries in `projects.js` (`page`, `description`, `preview` and the picture). Each page gets the project's documents already turned into HTML (so they show at once and search engines read them), what its import string adds, its About text from GitHub, and the latest version in the link preview (title and label). It also writes `assets/search.json`, the index behind the search in the header (projects, chat commands, the headings of their documents and the common problems), `feed.xml`, the release feed of all projects, and rebuilds `sitemap.xml`. For a new project, add those fields to its entry and run it. `.github/workflows/update-pages.yml` runs it every hour and after every change to `projects.js`, the template or the script, and commits to `main` only when something changed, so a change to a project's documents shows within the hour.
- The same script writes two pages of their own. `commands/` lists every chat command from the import strings, described by the rows of the projects' own command tables (or by the command's name in Streamer.bot), and builds a Twitch panel from the ones a visitor ticks (`assets/js/commands.js`); its template is `_tools/commands-page.html`. `help/` holds the common problems from `_tools/problems.md` (one `## ` heading each; edit that file to add one) and the table of the Streamer.bot version each project was last exported from; its template is `_tools/help-page.html`.
- Project pages used to sit directly under the site (`/blackjack-game/`); `404.html` sends those old links on to the new address.
- The Featured box at the top of the start page shows the projects with a new release, a status change (`statusSince` in `projects.js`) or many downloads in the last days: the newest one big, up to two more below it, and the `fallback` project while there are none. Its rules are `featured` in `projects.js`. The downloads per day come from `.github/workflows/download-counts.yml`, which runs `_tools/download-counts.js` once a day and keeps the result as `downloads.json` on the `stats` branch.
- `_scenes/` holds the sources of the example scenes on the project cards (see `_scenes/render.ps1`).

## Credits

Headings are set in [Sora](https://github.com/sora-xor/sora-font), licensed under the SIL Open Font License (see [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)).

The project pages turn Markdown into HTML with [marked](https://github.com/markedjs/marked) (MIT License) and clean it with [DOMPurify](https://github.com/cure53/DOMPurify) (Apache License 2.0 or Mozilla Public License 2.0), both in [`assets/js/vendor/`](assets/js/vendor) with their license notices.
