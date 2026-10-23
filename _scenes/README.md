# Scene mockups

The pictures on top of the project cards (`assets/img/scenes/`) are rendered from the pages in this folder.

- One page per project, named like its picture: `hangman-game.html` becomes `hangman-game.jpg`. The chat lines are plain HTML inside each page.
- `overlays/` holds copies of the real OBS overlays from the Hangman (v11.0.0), Battleship (v1.0.0) and Blackjack (v16.1.1) releases. The `*_state.json` next to each overlay is the sample game it shows, in the same format the game writes.
- The chat messages are the games' default texts. Viewer names, bets and numbers are made up.
- `scene.css` is the shared stream frame and chat panel; `img/` holds full-size logos for the chat-only games.

## Fonts

The Blackjack chat draws its playing cards with Noto Sans Symbols 2, licensed under the SIL Open Font License (see `fonts/OFL.txt`).
