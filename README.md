# aaskjer.github.io

Source of [aaskjer.github.io](https://aaskjer.github.io), the overview page for my Streamer.bot extensions.

Plain HTML, CSS and JavaScript, published by GitHub Pages straight from the `main` branch. There is no build step.

- `assets/js/projects.js` lists the projects; the start page and the project pages are built from it.
- Each project has its own page in a folder named after it (`blackjack-game/index.html` and so on). The page shows the project's README, setup guide, manual and FAQ, loaded live from its repository, and a changelog (its `CHANGELOG.md`, or else its release notes or commit history), so it never needs updating when the documents change. For a new project, copy one of the folders, change the title, descriptions, picture and `data-repo`, and add `page` to its entry in `projects.js`.
- Each project page also carries the project's name, tagline and features as plain text for search engines, and `sitemap.xml` lists every page. Both come from `projects.js`: after adding a project or changing those fields, run `node _tools/update-pages.js`.
- `_scenes/` holds the sources of the example scenes on the project cards (see `_scenes/render.ps1`).

## Credits

Headings are set in [Sora](https://github.com/sora-xor/sora-font), licensed under the SIL Open Font License (see [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)).

The project pages turn Markdown into HTML with [marked](https://github.com/markedjs/marked) (MIT License) and clean it with [DOMPurify](https://github.com/cure53/DOMPurify) (Apache License 2.0 or Mozilla Public License 2.0), both in [`assets/js/vendor/`](assets/js/vendor) with their license notices.
