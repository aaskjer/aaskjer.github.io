# Scene mockups

The pictures on top of the project cards (`assets/img/scenes/`) are rendered from the pages in this folder.

- One page per project, named like its picture: `hangman-game.html` becomes `hangman-game.jpg`. The chat lines are plain HTML inside each page.
- `overlays/` holds copies of the real OBS overlays from the Hangman (v11.0.0), Battleship (v1.0.0), Blackjack (v16.1.1) and OBS Notes (v1.0.1) releases. The `*_state.json` next to each overlay is the sample game or note list it shows, in the same format the extension writes.
- The chat messages are the extensions' default texts. Viewer names, bets, notes and numbers are made up.
- `scene.css` is the shared stream frame and chat panel; `img/` holds full-size logos for the chat-only scenes.
- `logos/` holds the vector sources of the OBS Notes and Chat Calendar logos (`assets/img/projects/*.png`, 256x256 with a transparent background). `streamerbot.svg` is the official Streamer.bot logo from streamer.bot, built into the Chat Calendar logo. To render one: Edge or Chrome with `--headless=new --window-size=256,256 --force-device-scale-factor=2 --default-background-color=00000000 --screenshot=...` on the SVG, then scale the 512x512 result down to 256x256 (the full size goes to `img/chatcalendar.png` for the scene).
- `get-started/` holds the Streamer.bot screenshots (v1.0.7, importing and setting up Chat Calendar) that steps 2 and 3 of "Get started" play. `node _tools/demo-images.js` turns them into the WebP pictures in `assets/img/get-started/`.
- `og-home.html` is the link preview of the start page (`assets/img/og-home.jpg`, 1200x630), the picture Discord and others show under a shared link. Render it again when a project logo is added: `render.ps1 -Scene og-home`.

## Fonts

The Blackjack chat draws its playing cards with Noto Sans Symbols 2, licensed under the SIL Open Font License (see `fonts/OFL.txt`).
