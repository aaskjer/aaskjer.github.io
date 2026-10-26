# Scene mockups

The pictures on top of the project cards (`assets/img/scenes/`) are rendered from the pages in this folder.

- One page per project, named like its picture: `hangman-game.html` becomes `hangman-game.jpg`. The chat lines are plain HTML inside each page.
- `overlays/` holds copies of the real OBS overlays from the Hangman (v11.0.0), Battleship (v1.0.0), Blackjack (v16.1.1) and OBS Notes (v1.0.0) releases. The `*_state.json` next to each overlay is the sample game or note list it shows, in the same format the extension writes.
- The chat messages are the extensions' default texts. Viewer names, bets, notes and numbers are made up.
- `scene.css` is the shared stream frame and chat panel; `img/` holds full-size logos for the chat-only scenes.
- `og-home.html` is the link preview of the start page (`assets/img/og-home.jpg`, 1200x630), the picture Discord and others show under a shared link. Render it again when a project logo is added: `render.ps1 -Scene og-home`.

## Fonts

The Blackjack chat draws its playing cards with Noto Sans Symbols 2, licensed under the SIL Open Font License (see `fonts/OFL.txt`).
