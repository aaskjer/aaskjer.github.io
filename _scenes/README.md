# Scene mockups

The pictures on top of the project cards (`assets/img/scenes/`) are rendered from the pages in this folder.

- One page per project, named like its picture: `hangman-game.html` becomes `hangman-game.jpg`. The chat lines are plain HTML inside each page.
- `overlays/` holds copies of the real OBS overlays from the Hangman (v11.0.0), Battleship (v1.0.0) and Blackjack (v16.1.1) releases. The `*_state.json` next to each overlay is the sample game it shows, in the same format the game writes.
- The chat messages are the games' default texts. Viewer names, bets and numbers are made up.
- `scene.css` is the shared stream frame and chat panel; `img/` holds full-size logos for the chat-only games.

## Rendering

Needs Google Chrome or Microsoft Edge, and Python for a local web server (the overlays load their game state over HTTP):

```powershell
powershell -ExecutionPolicy Bypass -File _scenes\render.ps1
```

`-Scene hangman-game` renders one scene, `-Port 8800` uses another port. Each page is 1600×900; the script saves `name.jpg` (1600×900) and `name-thumb.jpg` (960×540) into `assets/img/scenes/`, overwriting the old pictures.

Better Stream Announcements uses the Hangman picture as its stream preview, so render Hangman first when both change. The default order already does.

## Fonts

The Blackjack chat draws its playing cards with Noto Sans Symbols 2, licensed under the SIL Open Font License (see `fonts/OFL.txt`).
