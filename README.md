# aaskjer.github.io

Source of [aaskjer.github.io](https://aaskjer.github.io), the overview page for my Streamer.bot extensions.

Plain HTML, CSS and JavaScript, published by GitHub Pages straight from the `main` branch. There is no build step.

## Editing the projects

Every card comes from [`assets/js/projects.js`](assets/js/projects.js): add, remove or reorder entries there.
Stars, downloads, versions and "updated" dates are fetched live from the GitHub API.
Public repositories that are not listed in that file show up on their own under **More on GitHub**.

The pictures on top of the cards are rendered from the mockups in [`_scenes/`](_scenes/README.md), which also explains how to render them again.

## Local preview

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Credits

Headings are set in [Sora](https://github.com/sora-xor/sora-font), licensed under the SIL Open Font License (see [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)).
