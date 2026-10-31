/*
 * Battleship Game's rules for the playground (see assets/js/playground.js): battles against the
 * Admiral, the game's CPU opponent, as Battleship_Game.cs plays them with its default settings, its
 * chat lines word for word, and the battleship_state.json it writes for the overlay. Two ways to play
 * on your own: !battleship, your fleet against the Admiral's with every sinking paid or charged on the
 * spot, and !seeschlacht, the chat's battle, where !fire is a vote and every 15 seconds the square with
 * the most votes is fired at. Points are pretend: a balance of 10.000 that "Start over" fills again.
 * The team duel needs two teams of chatters, and the stats and the moderators' stop stay in the real
 * game.
 */
(() => {
  'use strict';

  const USER_POINTS = 10000;
  // the playground's chat is a Twitch chat, which is where the game whispers
  const PLATFORM = 'twitch';
  const RULES = {
    pointsName: 'Points',
    separator: '.',
    gridSize: 8,
    noTouchingRule: true,
    // BuildFleet with the ships switched on by default: the Battleship and the Submarine are off
    fleet: [
      { key: 'carrier', name: 'Carrier', length: 5, value: 500 },
      { key: 'cruiser', name: 'Cruiser', length: 3, value: 300 },
      { key: 'destroyer', name: 'Destroyer', length: 2, value: 200 },
    ],
    admiralName: 'The Admiral',
    admiralDifficulty: 'captain',
    admiralBlunderChance: 0,
    // the beat between the player's shot and the Admiral's, as AdmiralDelayMs
    admiralDelayMs: 700,
    winBonus: 0,
    chargeDamagedOnAbandon: true,
    clampBalanceAtZero: true,
    // 0: the player needs their own fleet's total
    minBalanceToPlay: 0,
    deployTimeoutSec: 60,
    turnTimeoutSec: 90,
    turnWarnFirstSec: 30,
    turnWarnSecondSec: 15,
    whisperOwnFleet: true,
    chatTeamName: 'Chat',
    chatRoundSec: 15,
    // how often the game's ticker looks at the clocks, as TickIntervalMs
    tickMs: 1000,
  };

  // Battleship_Game.cs's default chat lines
  const MSG = {
    gameStart: '🚢 {user} puts to sea against {admiral}! {ships} ships on a {size}x{size} grid. Fire with !fire B7 — {deploy}s to open fire.',
    fleetRerolled: '🔄 {user}, your fleet has been redeployed.',
    fleetTooLate: '@{user}, the battle has already started — you can only redeploy before your first shot.',
    playerMiss: '🌊 {user} fires at {coord} — splash, nothing there.',
    playerHit: '💥 {user} fires at {coord} — HIT!',
    playerSunk: "🔥 {user} SINKS the {admiral}'s {ship} at {coord}! +{amount} {points} — {enemyleft} enemy ships left.",
    admiralMiss: '🌊 {admiral} returns fire at {coord} — miss.',
    admiralHit: '💢 {admiral} returns fire at {coord} — your ship is hit!',
    admiralSunk: '☠️ {admiral} sinks your {ship} at {coord}! −{amount} {points} — {yourleft} of your ships left.',
    boardStatus: "🎯 {user}: {shots} shots, {hits} hits ({accuracy}%). Your fleet: {yourleft} — {admiral}'s fleet: {enemyleft}. Running total: {net} {points}.",
    chatStarted: '⚓ {team} takes on {admiral}! Click enemy waters on stream or vote with !fire B7 — every {round}s the square with the most votes is fired at. Just for fun: no points to win or lose.',
    chatSinks: "🔥 {team} SINKS {admiral}'s {ship} at {coord}! {enemyleft} enemy ships left.",
    chatLosesShip: "☠️ {admiral} sinks {team}'s {ship} at {coord}! {yourleft} ships left.",
    win: "🏆 {user} has sunk the {admiral}'s entire fleet in {shots} shots! Net for the battle: {net} {points}.",
    loss: "💀 {admiral} has sunk {user}'s fleet. Net for the battle: {net} {points}.",
    turnTimeout: '⏰ {user} abandoned the battle. Net for the battle: {net} {points}.',
    deployTimeout: '⚓ {user} never gave the order to fire — the fleet returns to port. Nothing lost.',
    chatWins: "🏆 {team} has sunk {admiral}'s entire fleet in {shots} shots — {voters} of you voted. Well played!",
    chatLoses: "💀 {admiral} has sunk {team}'s fleet after {shots} shots. Better luck next time!",
    chatAbandoned: '⏰ Nobody voted for {seconds}s — {team} breaks off the battle against {admiral}.',
    turnWarnFirst: '⏳ @{user}, {seconds} seconds to fire before you forfeit the battle!',
    turnWarnSecond: '⚠️ @{user}, {seconds} SECONDS — fire now!',
    noGame: '@{user}, you have no battle running. Start one with !battleship',
    alreadyInGame: '@{user}, you are already at sea. Fire with !fire B7.',
    badCoord: "@{user}, '{input}' is not a square on this board. Use a letter and a number, like B7 (A1 to {max}).",
    noCoord: '@{user}, name a square to fire at, like !fire B7',
    alreadyFired: '@{user}, you have already fired at {coord}. Pick another square — this one is free.',
    notEnoughPoints: '@{user}, you need at least {required} {points} to put a fleet to sea. You have {balance}.',
    chatBusy: '@{user}, a battle is already running — {team} can take on {admiral} once it is over.',
    whisperFleet: 'Your fleet is deployed: {fleet}. The Admiral cannot read this — or your chat. Good hunting!',
  };

  // what the overlay reads from the settings, at their defaults
  const LOOKS = {
    scale: 1, fontScale: 1, admiralName: RULES.admiralName, showPlayerRoster: true, showEnemyRoster: true,
    showCoords: true, showTurnTimer: true, showScore: true, animationsEnabled: true, hideOnFreeGame: false,
    hitColor: '#ff5a3c', missColor: '#8fb8d8', sunkColor: '#d3283a', shipColor: '#5b6b7c', gridColor: '#4a7fa5',
    waterColor: '#0d2438', backgroundColor: '#000000', backgroundOpacity: 0, gameOverFadeMs: 8000,
  };

  // BuildBaseOverlayState as Newtonsoft writes it to battleship_state.json, camelCase and nulls
  // included: what Init leaves on the overlay while no battle is at sea
  function baseState() {
    return {
      active: false, phase: 'deploy', platform: null, user: null, pointsName: RULES.pointsName,
      numberSeparator: RULES.separator, freeGame: false, gameOver: false, outcome: '', lastEvent: '',
      size: 0, shots: 0, hits: 0, net: 0, expiresInMs: 0, timeoutMs: 0, warnFirstMs: 0, warnSecondMs: 0,
      lastPlayerShot: '', lastAdmiralShot: '', matchId: '', heatPlayerId: '', heatLinkedId: '', mode: 'solo',
      turn: '', turnName: '', winner: '', voterIds: [], round: 0, voters: 0, votes: {},
      ...LOOKS,
      player: null, enemy: null,
    };
  }

  // Fill: each {key} in turn, everywhere it appears - so, as in the game, text put in for one key can
  // still be taken for a later one
  function fill(template, pairs) {
    let text = template;
    for (const key of Object.keys(pairs)) text = text.split(`{${key}}`).join(String(pairs[key]));
    return text;
  }

  // 1234567 → "1.234.567", as FormatNumber with the "." separator
  function formatNumber(value) {
    const digits = String(Math.round(Math.abs(value)));
    let out = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) out += RULES.separator;
      out += digits[i];
    }
    return (value < 0 ? '-' : '') + out;
  }
  const formatSigned = value => (value > 0 ? '+' : value < 0 ? '-' : '') + formatNumber(Math.abs(value));

  const pick = list => list[Math.floor(Math.random() * list.length)];

  /* ---------- squares ---------- */

  // Zero-based: the column is the letter, the row the number, so A1 is { col: 0, row: 0 }.
  const coord = (col, row) => ({ col, row });
  const coordText = c => String.fromCharCode(65 + c.col) + (c.row + 1);
  const inBounds = (c, size) => c.col >= 0 && c.row >= 0 && c.col < size && c.row < size;
  const sameSquare = (a, b) => a.col === b.col && a.row === b.row;
  const has = (list, c) => list.some(x => sameSquare(x, c));

  // Coord.TryParse: "B7", "b7", "B 7", "b-7" - forgiving about case and separators, strict about
  // the shape, so a typo reports as a typo instead of firing somewhere else
  function parseCoord(text, size) {
    if (!text || !text.trim()) return null;
    const s = text.trim().replace(/[ \-.,]/g, '');
    if (s.length < 2) return null;
    const letter = s[0].toUpperCase();
    if (letter.length !== 1 || letter < 'A' || letter > 'Z') return null;
    const digits = s.slice(1);
    if (!/^[0-9]+$/.test(digits)) return null;
    const candidate = coord(letter.charCodeAt(0) - 65, parseInt(digits, 10) - 1);
    return inBounds(candidate, size) ? candidate : null;
  }

  /* ---------- the boards ---------- */

  const UNKNOWN = 0;
  const MISS = 1;
  const HIT = 2;
  const grid = (size, value) => Array.from({ length: size }, () => Array(size).fill(value));
  const isSunk = ship => ship.hits >= ship.cells.length && ship.cells.length > 0;
  const isDamaged = ship => ship.hits > 0 && !isSunk(ship);
  // what a battle given up charges for a ship still afloat: its value pro rata to the damage taken
  const partialValue = ship => ship.cells.length === 0 ? 0 : Math.round(ship.def.value * ship.hits / ship.cells.length);
  const byLength = ships => [...ships].sort((a, b) => b.cells.length - a.cells.length);

  // One side's waters: the ships in them, and every shot fired at them. A board never knows who is
  // firing, so the same kind serves the player and the Admiral.
  class Board {
    constructor(size) {
      this.size = size;
      this.ships = [];
      this.shots = grid(size, UNKNOWN);
      this.occupancy = grid(size, null);
    }

    stateAt(c) { return this.shots[c.col][c.row]; }
    shipAt(c) { return this.occupancy[c.col][c.row]; }
    get allSunk() { return this.ships.length > 0 && this.ships.every(isSunk); }
    get shipsRemaining() { return this.ships.filter(s => !isSunk(s)).length; }
    get survivingLengths() { return this.ships.filter(s => !isSunk(s)).map(s => s.cells.length); }

    // 'invalid' and 'duplicate' never cost a turn
    fire(c) {
      if (!inBounds(c, this.size)) return { result: 'invalid', sunk: null };
      if (this.shots[c.col][c.row] !== UNKNOWN) return { result: 'duplicate', sunk: null };
      const ship = this.occupancy[c.col][c.row];
      if (!ship) {
        this.shots[c.col][c.row] = MISS;
        return { result: 'miss', sunk: null };
      }
      this.shots[c.col][c.row] = HIT;
      ship.hits++;
      return isSunk(ship) ? { result: 'sunk', sunk: ship } : { result: 'hit', sunk: null };
    }

    canPlace(def, start, horizontal, noTouching) {
      for (let i = 0; i < def.length; i++) {
        const cell = horizontal ? coord(start.col + i, start.row) : coord(start.col, start.row + i);
        if (!inBounds(cell, this.size) || this.shipAt(cell)) return false;
        if (!noTouching) continue;
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            const n = coord(cell.col + dc, cell.row + dr);
            if (inBounds(n, this.size) && this.shipAt(n)) return false;
          }
        }
      }
      return true;
    }

    place(def, start, horizontal) {
      const ship = { def, cells: [], hits: 0 };
      for (let i = 0; i < def.length; i++) {
        const cell = horizontal ? coord(start.col + i, start.row) : coord(start.col, start.row + i);
        ship.cells.push(cell);
        this.occupancy[cell.col][cell.row] = ship;
      }
      this.ships.push(ship);
    }

    // Every legal placement, then one at random: a ship goes down whenever it fits at all.
    tryPlaceOne(def, noTouching) {
      const options = [];
      for (let col = 0; col < this.size; col++) {
        for (let row = 0; row < this.size; row++) {
          const start = coord(col, row);
          if (this.canPlace(def, start, true, noTouching)) options.push([start, true]);
          if (def.length > 1 && this.canPlace(def, start, false, noTouching)) options.push([start, false]);
        }
      }
      if (!options.length) return false;
      const [start, horizontal] = pick(options);
      this.place(def, start, horizontal);
      return true;
    }

    // Longest ships first, 40 tries, then the same without the no-touching rule.
    static createRandom(size, defs, noTouching) {
      const ordered = [...defs].sort((a, b) => b.length - a.length);
      for (const relaxed of [noTouching, false]) {
        for (let attempt = 0; attempt < 40; attempt++) {
          const board = new Board(size);
          if (ordered.every(def => board.tryPlaceOne(def, relaxed))) return board;
        }
        if (!relaxed) break;
      }
      throw new Error(`Could not fit ${defs.length} ships on a ${size}x${size} grid.`);
    }
  }

  /* ---------- the Admiral ---------- */

  // It only sees what a fair opponent sees: where it fired, what it found there, and the lengths
  // still afloat. It is never handed the board it fires at.
  class AdmiralAi {
    constructor(size, level, blunderChance) {
      this.size = size;
      this.level = level;
      this.blunderChance = Math.max(0, Math.min(1, blunderChance));
      this.known = grid(size, UNKNOWN);
      this.openHits = [];
    }

    untried(c) { return inBounds(c, this.size) && this.known[c.col][c.row] === UNKNOWN; }

    untriedCells() {
      const list = [];
      for (let col = 0; col < this.size; col++) {
        for (let row = 0; row < this.size; row++) if (this.known[col][row] === UNKNOWN) list.push(coord(col, row));
      }
      return list;
    }

    chooseShot(survivingLengths) {
      const untried = this.untriedCells();
      if (!untried.length) throw new Error('The Admiral has no cells left to fire at.');
      // the handicap: throw the plan away and fire blind
      if (this.blunderChance > 0 && Math.random() < this.blunderChance) return pick(untried);
      if (this.level !== 'ensign') {
        const followUp = this.targetShot();
        if (followUp) return followUp;
      }
      if (this.level === 'admiral') {
        const hunted = this.parityHunt(untried, survivingLengths);
        if (hunted) return hunted;
      }
      return pick(untried);
    }

    // Works an unfinished ship: around one loose hit, or at the two ends of hits that line up.
    targetShot() {
      const hits = this.openHits;
      if (!hits.length) return null;
      if (hits.length >= 2) {
        const sameRow = hits.every(h => h.row === hits[0].row);
        const sameCol = hits.every(h => h.col === hits[0].col);
        if (sameRow || sameCol) {
          const ends = [];
          if (sameRow) {
            const cols = hits.map(h => h.col);
            ends.push(coord(Math.min(...cols) - 1, hits[0].row), coord(Math.max(...cols) + 1, hits[0].row));
          } else {
            const rows = hits.map(h => h.row);
            ends.push(coord(hits[0].col, Math.min(...rows) - 1), coord(hits[0].col, Math.max(...rows) + 1));
          }
          const open = ends.filter(c => this.untried(c));
          if (open.length) return pick(open);
        }
      }
      const neighbours = [];
      for (const hit of hits) {
        const around = [coord(hit.col - 1, hit.row), coord(hit.col + 1, hit.row), coord(hit.col, hit.row - 1), coord(hit.col, hit.row + 1)];
        for (const n of around) if (this.untried(n) && !has(neighbours, n)) neighbours.push(n);
      }
      return neighbours.length ? pick(neighbours) : null;
    }

    // The Admiral level hunts on a lattice spaced to the shortest ship afloat, skipping cells with no room.
    parityHunt(untried, survivingLengths) {
      let shortest = survivingLengths && survivingLengths.length ? Math.min(...survivingLengths) : 2;
      if (shortest < 1) shortest = 1;
      let roomy = untried.filter(c => this.hasRoomFor(c, shortest));
      if (!roomy.length) roomy = untried;
      const onLattice = roomy.filter(c => (c.col + c.row) % shortest === 0);
      return pick(onLattice.length ? onLattice : roomy);
    }

    hasRoomFor(c, length) {
      if (length <= 1) return true;
      for (const horizontal of [true, false]) {
        let run = 1;
        for (const sign of [-1, 1]) {
          for (let step = 1; step < length; step++) {
            const n = horizontal ? coord(c.col + sign * step, c.row) : coord(c.col, c.row + sign * step);
            if (!inBounds(n, this.size) || this.known[n.col][n.row] === MISS) break;
            run++;
          }
        }
        if (run >= length) return true;
      }
      return false;
    }

    recordResult(c, result, sunkLength) {
      if (!inBounds(c, this.size)) return;
      if (result === 'miss') this.known[c.col][c.row] = MISS;
      else if (result === 'hit' || result === 'sunk') {
        this.known[c.col][c.row] = HIT;
        if (!has(this.openHits, c)) this.openHits.push(c);
        if (result === 'sunk') this.retireSunkRun(c, sunkLength);
      }
    }

    // On a sinking, only the run of hits that made that ship stops being worked.
    retireSunkRun(last, sunkLength) {
      if (sunkLength <= 0 || this.openHits.length <= sunkLength) {
        this.openHits = [];
        return;
      }
      for (const horizontal of [true, false]) {
        const run = [last];
        for (const sign of [-1, 1]) {
          for (let step = 1; step < sunkLength; step++) {
            const n = horizontal ? coord(last.col + sign * step, last.row) : coord(last.col, last.row + sign * step);
            if (!has(this.openHits, n)) break;
            run.push(n);
          }
        }
        if (run.length >= sunkLength) {
          const retired = run.slice(0, sunkLength);
          this.openHits = this.openHits.filter(h => !has(retired, h));
          return;
        }
      }
      this.openHits = [];
    }
  }

  // . unknown  o miss  x hit  X sunk  s a ship (the player's own, or the enemy's once it is over)
  function buildSide(board, revealShips, name) {
    const rows = [];
    for (let row = 0; row < board.size; row++) {
      let line = '';
      for (let col = 0; col < board.size; col++) {
        const c = coord(col, row);
        const ship = board.shipAt(c);
        const shot = board.stateAt(c);
        if (shot === HIT) line += ship && isSunk(ship) ? 'X' : 'x';
        else if (shot === MISS) line += 'o';
        else if (ship && (revealShips || isSunk(ship))) line += 's';
        else line += '.';
      }
      rows.push(line);
    }
    return {
      name, size: board.size, shipsRemaining: board.shipsRemaining, rows,
      roster: byLength(board.ships).map(s => ({ name: s.def.name, length: s.cells.length, hits: s.hits, sunk: isSunk(s), value: s.def.value })),
    };
  }

  const matchId = () => Array.from({ length: 8 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

  /* ---------- the battles ---------- */

  function create(api) {
    let balance;
    let matches;
    let owner;
    let ticker = null;
    let started;
    let viewer;

    function reset() {
      clearTimeout(ticker);
      ticker = null;
      balance = USER_POINTS;
      // the battles at sea, by key: "chat" for the chat's, "twitch:<user id>" for a player's
      matches = new Map();
      // the battle on the overlay: it keeps it until it ends, and a finished one until another starts
      owner = null;
      started = 0;
      viewer = 'viewer';
    }
    reset();

    const say = (text, delay) => api.say(text, delay);
    const keyOf = m => m.isChat ? 'chat' : `${PLATFORM}:${m.userId}`;
    const remainingMs = m => Math.max(0, m.deadline - Date.now());
    const roundSeconds = () => Math.max(5, RULES.chatRoundSec);
    const idleSeconds = m => m.hasFired ? Math.max(5, RULES.turnTimeoutSec) : Math.max(5, RULES.deployTimeoutSec);
    const totalTimeoutMs = m => m.isChat ? roundSeconds() * 1000
      : (m.deployPhase ? Math.max(5, RULES.deployTimeoutSec) : Math.max(5, RULES.turnTimeoutSec)) * 1000;

    function newMatch(user, userId, isChat) {
      return {
        id: matchId(), order: started++, user, userId, isChat,
        size: Math.max(5, Math.min(12, RULES.gridSize)), fleet: RULES.fleet,
        player: null, enemy: null, ai: null,
        started: false, finished: false, closing: false, hasFired: false, ending: null,
        shots: 0, hits: 0, net: 0, shipsSunkByPlayer: 0, shipsLost: 0,
        lastPlayerShot: null, lastAdmiralShot: null, lastEvent: '',
        // until start sets the real clock
        deadline: Date.now() + Math.max(5, RULES.deployTimeoutSec) * 1000,
        deployPhase: true, warnedFirst: false, warnedSecond: false,
        // the chat's battle: this round's ballot of each voter, in the order cast, and everyone who voted
        votes: new Map(), voters: new Set(), lastActivity: Date.now(), round: 0,
        // what the overlay was left with when it ended
        final: null,
      };
    }

    /* ---------- the overlay ---------- */

    function voteCounts(m) {
      const counts = {};
      for (const c of m.votes.values()) counts[coordText(c)] = (counts[coordText(c)] || 0) + 1;
      return counts;
    }

    // WriteOverlayState's battleship_state.json for this battle
    function stateOf(m) {
      const state = {
        ...baseState(),
        active: true,
        phase: m.finished ? 'over' : m.isChat ? 'vote' : m.deployPhase ? 'deploy' : 'battle',
        platform: PLATFORM,
        user: m.user,
        gameOver: m.finished,
        outcome: m.ending || '',
        lastEvent: m.lastEvent,
        size: m.size,
        shots: m.shots,
        hits: m.hits,
        net: m.net,
        expiresInMs: remainingMs(m),
        timeoutMs: totalTimeoutMs(m),
        warnFirstMs: Math.max(0, RULES.turnWarnFirstSec) * 1000,
        warnSecondMs: Math.max(0, RULES.turnWarnSecondSec) * 1000,
        lastPlayerShot: m.lastPlayerShot ? coordText(m.lastPlayerShot) : '',
        lastAdmiralShot: m.lastAdmiralShot ? coordText(m.lastAdmiralShot) : '',
        matchId: m.id,
        // a Twitch player's id, for the click-to-fire extension (off by default)
        heatPlayerId: m.userId,
        heatLinkedId: '',
        mode: m.isChat ? 'chat' : 'solo',
      };
      if (m.isChat) {
        // no single player, no warnings - the round, its ballots and the crowd
        state.heatPlayerId = '';
        state.warnFirstMs = 0;
        state.warnSecondMs = 0;
        state.round = m.round;
        state.votes = voteCounts(m);
        state.voters = m.voters.size;
      }
      // the player's own waters in full, the Admiral's fogged until the battle is over
      state.player = buildSide(m.player, true, m.user);
      state.enemy = buildSide(m.enemy, m.finished, RULES.admiralName);
      return state;
    }

    // What battleship_state.json holds: the battle on the overlay as it is now (a chat line posts it as
    // it is sent), or as it was left when it ended - the game writes nothing after that, and the overlay
    // fades it out by itself. Before any battle, what Init writes.
    function overlay() {
      if (!owner) return baseState();
      return owner.final || stateOf(owner);
    }

    // WriteOverlayState without a chat line: only the battle on the overlay is drawn
    function write(m) {
      if (owner === m) api.draw();
    }

    // ArbitrateOverlayOwner: the battle on the overlay keeps it while it lasts, then it goes to the one
    // that has waited longest
    function arbitrate() {
      if (owner && !owner.finished) return;
      const next = [...matches.values()].filter(m => !m.finished && m.started).sort((a, b) => a.order - b.order)[0];
      if (!next) return;
      owner = next;
      api.draw();
    }

    // The game's ticker: once a second while anything is at sea.
    function ensureTicker() {
      if (ticker !== null || !matches.size) return;
      ticker = setTimeout(beat, RULES.tickMs);
    }

    function beat() {
      ticker = null;
      for (const m of [...matches.values()]) if (!m.finished) tick(m);
      arbitrate();
      ensureTicker();
    }

    /* ---------- !battleship and !seeschlacht ---------- */

    function startSolo(user) {
      const key = `${PLATFORM}:${user}`;
      if (matches.has(key) && !matches.get(key).finished) {
        say(fill(MSG.alreadyInGame, { user }));
        return;
      }
      // a broke player needs something on the line to lose before a fleet goes out
      const fleetValue = RULES.fleet.reduce((sum, s) => sum + s.value, 0);
      const required = RULES.minBalanceToPlay > 0 ? RULES.minBalanceToPlay : fleetValue;
      if (balance < required) {
        say(fill(MSG.notEnoughPoints, { user, required: formatNumber(required), balance: formatNumber(balance), points: RULES.pointsName }));
        return;
      }
      const m = newMatch(user, user, false);
      matches.set(key, m);
      start(m);
      arbitrate();
      ensureTicker();
    }

    // The chat is everybody, so its battle does not wait behind another: it starts when nothing is at sea.
    function startChat(user) {
      if (matches.size) {
        say(fill(MSG.chatBusy, { user, team: RULES.chatTeamName, admiral: RULES.admiralName }));
        return;
      }
      const chat = newMatch(RULES.chatTeamName, '', true);
      matches.set('chat', chat);
      start(chat);
      arbitrate();
      ensureTicker();
    }

    function start(m) {
      m.player = Board.createRandom(m.size, m.fleet, RULES.noTouchingRule);
      m.enemy = Board.createRandom(m.size, m.fleet, RULES.noTouchingRule);
      m.ai = new AdmiralAi(m.size, RULES.admiralDifficulty, RULES.admiralBlunderChance);
      m.deployPhase = true;
      resetClock(m);
      if (m.isChat) {
        say(fill(MSG.chatStarted, {
          team: m.user, user: m.user, admiral: RULES.admiralName, round: roundSeconds(), ships: m.fleet.length, size: m.size,
        }));
      } else {
        say(fill(MSG.gameStart, {
          user: m.user, admiral: RULES.admiralName, ships: m.fleet.length, size: m.size, deploy: Math.max(5, RULES.deployTimeoutSec),
        }));
        whisperFleet(m);
      }
      m.started = true;
    }

    // The player's fleet by whisper, which the playground shows as a note.
    function whisperFleet(m) {
      if (!RULES.whisperOwnFleet) return;
      const parts = byLength(m.player.ships).map(s => `${s.def.name} ${s.cells.map(coordText).join('-')}`);
      api.note(`StreamBot whispers to you: ${fill(MSG.whisperFleet, { user: m.user, fleet: parts.join(', ') })}`);
    }

    /* ---------- !fire, !fleet, !board ---------- */

    const ownMatch = user => {
      const m = matches.get(`${PLATFORM}:${user}`);
      return m && !m.finished ? m : null;
    };
    const liveChat = () => {
      const m = matches.get('chat');
      return m && !m.finished && m.started ? m : null;
    };

    function fire(user, raw) {
      const m = ownMatch(user);
      if (!m) {
        // no battle of their own: then !fire is a vote in the chat's battle, if one is on
        const chat = liveChat();
        if (chat) vote(chat, user, raw);
        else say(fill(MSG.noGame, { user }));
        return;
      }
      if (!raw) {
        say(fill(MSG.noCoord, { user }));
        return;
      }
      fireAt(m, raw);
    }

    function fireAt(m, input) {
      if (m.finished) return;
      const target = parseCoord(input, m.size);
      if (!target) {
        say(fill(MSG.badCoord, { user: m.user, input, max: coordText(coord(m.size - 1, m.size - 1)) }));
        return;
      }
      // a repeat shot is a misclick, not a move: it never costs the turn or the clock
      if (m.enemy.stateAt(target) !== UNKNOWN) {
        say(fill(MSG.alreadyFired, { user: m.user, coord: coordText(target) }));
        return;
      }
      resolveExchange(m, target);
    }

    // One exchange: the player's shot (or the chat's), then the Admiral's.
    function resolveExchange(m, target) {
      m.hasFired = true;
      m.deployPhase = false;
      m.lastPlayerShot = target;
      m.lastActivity = Date.now();

      const { result, sunk } = m.enemy.fire(target);
      m.shots++;
      if (result === 'hit' || result === 'sunk') m.hits++;

      const square = coordText(target);
      let line;
      if (result === 'miss') {
        m.lastEvent = 'player-miss';
        line = fill(MSG.playerMiss, { user: m.user, coord: square, admiral: RULES.admiralName });
      } else if (result === 'hit') {
        m.lastEvent = 'player-hit';
        line = fill(MSG.playerHit, { user: m.user, coord: square, admiral: RULES.admiralName });
      } else {
        m.lastEvent = 'player-sunk';
        m.shipsSunkByPlayer++;
        const earned = credit(m, sunk.def.value);
        line = fill(m.isChat ? MSG.chatSinks : MSG.playerSunk, {
          user: m.user, team: m.user, coord: square, ship: sunk.def.name, admiral: RULES.admiralName,
          amount: formatNumber(earned), points: RULES.pointsName, enemyleft: m.enemy.shipsRemaining,
        });
      }
      // the clock (or the chat's next round) starts with the shot, and the overlay shows both
      resetClock(m);
      say(line);

      if (m.enemy.allSunk) {
        settle(m, 'win');
        return;
      }
      admiralReturnFire(m);
    }

    function admiralReturnFire(m) {
      const shot = m.ai.chooseShot(m.player.survivingLengths);
      const { result, sunk } = m.player.fire(shot);
      m.ai.recordResult(shot, result, sunk ? sunk.cells.length : 0);
      m.lastAdmiralShot = shot;

      const square = coordText(shot);
      let line;
      if (result === 'miss') {
        m.lastEvent = 'admiral-miss';
        line = fill(MSG.admiralMiss, { user: m.user, coord: square, admiral: RULES.admiralName });
      } else if (result === 'hit') {
        m.lastEvent = 'admiral-hit';
        line = fill(MSG.admiralHit, { user: m.user, coord: square, admiral: RULES.admiralName });
      } else {
        m.lastEvent = 'admiral-sunk';
        m.shipsLost++;
        const lost = debit(m, sunk.def.value);
        line = fill(m.isChat ? MSG.chatLosesShip : MSG.admiralSunk, {
          user: m.user, team: m.user, coord: square, ship: sunk.def.name, admiral: RULES.admiralName,
          amount: formatNumber(lost), points: RULES.pointsName, yourleft: m.player.shipsRemaining,
        });
      }
      // a beat between the two volleys, so it reads as an exchange
      say(line, Math.max(0, Math.min(5000, RULES.admiralDelayMs)));

      if (m.player.allSunk) settle(m, 'loss');
    }

    // Only before the first shot: after it, a new fleet would be a free way out of a losing position.
    function fleet(user) {
      const m = ownMatch(user);
      if (!m) {
        say(fill(MSG.noGame, { user }));
        return;
      }
      if (m.hasFired) {
        say(fill(MSG.fleetTooLate, { user: m.user }));
        return;
      }
      m.player = Board.createRandom(m.size, m.fleet, RULES.noTouchingRule);
      say(fill(MSG.fleetRerolled, { user: m.user }));
      whisperFleet(m);
    }

    function board(user) {
      const m = ownMatch(user) || liveChat();
      if (!m) {
        say(fill(MSG.noGame, { user }));
        return;
      }
      const accuracy = m.shots === 0 ? 0 : Math.round(100 * m.hits / m.shots);
      say(fill(MSG.boardStatus, {
        user: m.user, admiral: RULES.admiralName, shots: m.shots, hits: m.hits, accuracy,
        yourleft: m.player.shipsRemaining, enemyleft: m.enemy.shipsRemaining, net: formatSigned(m.net), points: RULES.pointsName,
      }));
    }

    /* ---------- the chat's battle: votes ---------- */

    function vote(chat, user, raw) {
      if (!raw) {
        say(fill(MSG.noCoord, { user }));
        return;
      }
      const target = parseCoord(raw, chat.size);
      if (!target) {
        say(fill(MSG.badCoord, { user, input: raw, max: coordText(coord(chat.size - 1, chat.size - 1)) }));
        return;
      }
      if (chat.enemy.stateAt(target) !== UNKNOWN) {
        say(fill(MSG.alreadyFired, { user, coord: coordText(target) }));
        return;
      }
      castVote(chat, `${PLATFORM}:${user}`, target);
    }

    // One vote per voter per round: a second one is simply not counted, which is the cooldown.
    function castVote(m, voterKey, target) {
      if (!m.isChat || m.finished) return false;
      if (!inBounds(target, m.size) || m.enemy.stateAt(target) !== UNKNOWN) return false;
      if (m.votes.has(voterKey)) return false;
      m.votes.set(voterKey, target);
      m.voters.add(voterKey);
      m.lastActivity = Date.now();
      write(m);
      return true;
    }

    // The square with the most votes; on a tie, the one voted for first.
    function tallyVotes(m) {
      const tally = [];
      for (const c of m.votes.values()) {
        if (m.enemy.stateAt(c) !== UNKNOWN) continue;
        const entry = tally.find(t => sameSquare(t.square, c));
        if (entry) entry.count++;
        else tally.push({ square: c, count: 1 });
      }
      let best = null;
      for (const t of tally) if (!best || t.count > best.count) best = t;
      return best ? best.square : null;
    }

    /* ---------- the clock ---------- */

    function resetClock(m) {
      if (m.isChat) {
        // a new voting round: last round's ballots are spent
        m.votes.clear();
        m.round++;
        m.deadline = Date.now() + roundSeconds() * 1000;
        return;
      }
      const seconds = m.deployPhase ? Math.max(5, RULES.deployTimeoutSec) : Math.max(5, RULES.turnTimeoutSec);
      m.deadline = Date.now() + seconds * 1000;
      m.warnedFirst = false;
      m.warnedSecond = false;
    }

    // Each beat of the ticker. The warnings come once each, and only in a turn, not before the first shot.
    function tick(m) {
      if (m.isChat) {
        tickChat(m);
        return;
      }
      const left = remainingMs(m);
      if (left <= 0) {
        abandon(m, m.deployPhase ? 'deploytimeout' : 'turntimeout');
        return;
      }
      if (m.deployPhase) return;

      const turnSeconds = Math.max(5, RULES.turnTimeoutSec);
      const remaining = left / 1000;
      const second = Math.max(0, RULES.turnWarnSecondSec);
      if (!m.warnedSecond && second > 0 && second < turnSeconds && remaining <= second) {
        m.warnedSecond = true;
        m.warnedFirst = true;
        say(fill(MSG.turnWarnSecond, { user: m.user, seconds: second }));
        return;
      }
      const first = Math.max(0, RULES.turnWarnFirstSec);
      if (!m.warnedFirst && first > 0 && first < turnSeconds && remaining <= first) {
        m.warnedFirst = true;
        say(fill(MSG.turnWarnFirst, { user: m.user, seconds: first }));
      }
    }

    // At the end of each round the winning square is fired at. A round nobody voted in starts again,
    // until the chat has been quiet for as long as a player's clock would allow.
    function tickChat(m) {
      if (Date.now() < m.deadline) return;
      const target = tallyVotes(m);
      if (!target) {
        if (Date.now() - m.lastActivity >= idleSeconds(m) * 1000) {
          abandon(m, m.hasFired ? 'turntimeout' : 'deploytimeout');
          return;
        }
        resetClock(m);
        write(m);
        return;
      }
      resolveExchange(m, target);
    }

    /* ---------- the end of a battle ---------- */

    function abandon(m, how) {
      if (m.closing) return;
      m.closing = true;

      if (m.isChat) {
        say(fill(MSG.chatAbandoned, { team: m.user, user: m.user, admiral: RULES.admiralName, seconds: idleSeconds(m) }));
        close(m, how);
        return;
      }
      // nothing was at risk before the first shot
      if (how === 'deploytimeout' || !m.hasFired) {
        say(fill(MSG.deployTimeout, { user: m.user }));
        close(m, 'deploytimeout');
        return;
      }
      // otherwise a player could walk away one hit before their Carrier goes down
      if (RULES.chargeDamagedOnAbandon) {
        const damage = m.player.ships.filter(isDamaged).reduce((sum, s) => sum + partialValue(s), 0);
        if (damage > 0) debit(m, damage);
      }
      settleCore(m, how);
    }

    function settle(m, how) {
      if (m.closing) return;
      m.closing = true;
      settleCore(m, how);
    }

    function settleCore(m, how) {
      if (m.isChat) {
        // the chat's battle ends with a word to chat: there is nothing to settle
        say(fill(how === 'win' ? MSG.chatWins : MSG.chatLoses, {
          team: m.user, user: m.user, admiral: RULES.admiralName, shots: m.shots, voters: m.voters.size,
        }));
        close(m, how);
        return;
      }
      if (how === 'win' && RULES.winBonus > 0) credit(m, RULES.winBonus);
      const template = how === 'win' ? MSG.win : how === 'loss' ? MSG.loss : MSG.turnTimeout;
      say(fill(template, { user: m.user, admiral: RULES.admiralName, shots: m.shots, net: formatSigned(m.net), points: RULES.pointsName }));
      close(m, how);
    }

    // The result goes on the overlay and stays there; the battle leaves the sea, and the overlay goes on
    // to whichever battle is waiting. (The game also writes the player's stats, which the playground has not.)
    function close(m, how) {
      m.finished = true;
      // the game sets Ending a moment earlier too, but only the overlay reads it, from here on
      m.ending = how;
      m.lastEvent = 'over';
      m.final = stateOf(m);
      write(m);
      if (matches.get(keyOf(m)) === m) matches.delete(keyOf(m));
      arbitrate();
    }

    /* ---------- points: every sinking settles on the spot ---------- */

    function credit(m, amount) {
      // the chat's battle is played for fun: nobody is paid
      if (m.isChat || amount <= 0) return 0;
      balance += amount;
      m.net += amount;
      return amount;
    }

    function debit(m, amount) {
      // ...and nobody is charged
      if (m.isChat || amount <= 0) return 0;
      const charged = RULES.clampBalanceAtZero ? Math.min(amount, Math.max(0, balance)) : amount;
      balance -= charged;
      m.net -= charged;
      return charged;
    }

    /* ---------- chat ---------- */

    const DUEL = ['!duel', '!accept', '!team'];
    const STATS = ['!bstats', '!ballstats'];

    function handle(user, text) {
      viewer = user;
      const message = text.trim();
      const word = message.split(/\s+/)[0];
      const command = word.toLowerCase();
      // what Streamer.bot hands the game as rawInput: everything after the command
      const raw = message.slice(word.length).trim();
      if (command === '!battleship') startSolo(user);
      else if (command === '!seeschlacht') startChat(user);
      else if (command === '!fire') fire(user, raw);
      else if (command === '!fleet') fleet(user);
      else if (command === '!board') board(user);
      else if (DUEL.includes(command)) {
        api.note(`${word} is for the team duel, two teams of chatters taking turns, so it is not in the playground. On your own: !battleship, or !seeschlacht for the chat's battle.`);
      } else if (STATS.includes(command)) {
        api.note(`${word} reads the stats Streamer.bot saves for every chatter, so it is not in the playground.`);
      } else if (command === '!stopbattle') {
        api.note(`${word} is the moderators' stop, so it is not in the playground. "Start over" clears the waters here.`);
      }
    }

    // the battle the viewer's !fire goes to: their own, or else the chat's
    const viewerBattle = () => ownMatch(viewer) || liveChat();

    // Two squares worth a shot: next to a hit on a ship still afloat if there is one, else anywhere new.
    function targets() {
      const m = viewerBattle();
      if (!m) return [];
      const free = [];
      const next = [];
      for (let col = 0; col < m.size; col++) {
        for (let row = 0; row < m.size; row++) {
          const c = coord(col, row);
          if (m.enemy.stateAt(c) !== UNKNOWN) continue;
          const around = [coord(col - 1, row), coord(col + 1, row), coord(col, row - 1), coord(col, row + 1)];
          const nearHit = around.some(n => inBounds(n, m.size) && m.enemy.stateAt(n) === HIT && !isSunk(m.enemy.shipAt(n)));
          (nearHit ? next : free).push(c);
        }
      }
      const shuffled = list => list.map(c => [Math.random(), c]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      return [...shuffled(next), ...shuffled(free)].slice(0, 2).map(coordText);
    }

    return {
      handle, reset, overlay,
      // 'solo', 'chat' or '' - where the viewer's !fire goes
      get battle() { const m = viewerBattle(); return m ? (m.isChat ? 'chat' : 'solo') : ''; },
      get hasFired() { const m = viewerBattle(); return !!(m && m.hasFired); },
      get targets() { return targets(); },
      get balance() { return balance; },
    };
  }

  window.PlaygroundGames = window.PlaygroundGames || {};
  window.PlaygroundGames['Battleship-Game'] = {
    title: 'The Battleship overlay',
    scene: 'ocean',
    // the overlay draws a battle while the state is active, unless a free game is set to hide it
    isActive: state => !!state.active && !(state.freeGame && state.hideOnFreeGame),
    idle: ['No battle at sea', 'Type !battleship in the chat to put a fleet to sea.'],
    welcome: 'You are "viewer" with 10.000 pretend Points. Put to sea with !battleship and fire with !fire B7, or take on the Admiral as the chat with !seeschlacht.',
    note: 'Your own battle against the Admiral and the chat\'s battle, with the game\'s default settings and its own chat lines.',
    quick: engine => {
      const fire = engine.targets.map(square => `!fire ${square}`);
      if (engine.battle === 'solo') return [...fire, ...(engine.hasFired ? [] : ['!fleet']), '!board'];
      if (engine.battle === 'chat') return [...fire, '!board'];
      return ['!battleship', '!seeschlacht'];
    },
    create,
  };
})();
