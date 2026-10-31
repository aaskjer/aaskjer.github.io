/*
 * Classic Chat Gamble's rules for the playground (see assets/js/playground.js): !gamble as
 * CCG-Game.cs plays it with its default settings and its chat lines word for word. Points are
 * pretend: a balance of 10.000 that "Start over" fills again. The moderator commands work for the
 * viewer here: !SetFreeGamble and !EndFreeGamble switch Free Game Mode, and !gambleaddict puts a
 * name on the addicted list, whose wins are cut. Channel points, boosts and blocked viewers are the
 * streamer's settings and stay in the real game; the commands have no cooldown by default.
 */
(() => {
  'use strict';

  const USER_POINTS = 10000;
  const RULES = {
    pointsName: 'Points',
    pointsVar: 'points',
    platform: 'twitch',
    separator: '.',
    defaultBet: 1234,
    minBet: 0,
    maxBet: 9999999,
    // a roll of 1 to 10.000: the first JackpotPercent of it is a jackpot, the next WinPercent a win
    jackpotPercent: 1,
    winPercent: 30,
    // a win pays the bet times a random RndMin to RndMax on top of it, a jackpot that times JackpotMultiplier
    rndMin: 1.5,
    rndMax: 2.5,
    jackpotMultiplier: 43,
    addictedPayoutCutPercent: 50,
  };

  // CCG-Game.cs's default chat lines
  const MSG = {
    jackpot: '🎰 J A C K P O T 🎰 @{user} you WON the JACKPOT of: {amount} {pointsName}! New balance: {currentPoints} {pointsName}.',
    win: '@{user}, WINS! 🎉 You got {amount} {pointsName}! New balance: {currentPoints} {pointsName}.',
    addictedJackpot: '🎰 J A C K P O T 🎰 @{user} you WON the JACKPOT of: {amount} {pointsName}! -- Addiction Fee: your win was cut by {addictedCut}% -- New balance: {currentPoints} {pointsName}.',
    addictedWin: '@{user}, WINS! 🎉 You got {amount} {pointsName}! -- Addiction Fee: your win was cut by {addictedCut}% -- New balance: {currentPoints} {pointsName}.',
    loss: '@{user}, unlucky! You LOST {amount} {pointsName}. New balance: {currentPoints} {pointsName}.',
    freeGame: "@{user}, gamble runs in 'Free Mode'! Enjoy playing without spending any {pointsName}.",
    freeGameWin: '🎉 @{user}, you WON! Lucky you! 🎉',
    freeGameJackpot: '🎰 J A C K P O T 🎰 @{user}, you hit the JACKPOT! Incredible! 🎰',
    freeGameLoss: "@{user}, unlucky! Luckily it's Free Mode, so you lost nothing. 🍀",
    freeGameStart: '🎲 Free Gamble Mode is now ACTIVE! Gamble for free — no points needed!',
    freeGameEnd: '⏹️ Free Gamble Mode has ended. Normal betting is back, time to waste points!',
    invalidBet: '❌ @{user}, {reason}',
    NegativeAmount: "that's not a valid amount: no decimals, nothing negative and nothing too large.",
    InsufficientFunds: "you don't have enough {pointsName}.",
    BelowMinimum: 'your bet is below the allowed minimum ({min} {pointsName}).',
    AboveMaximum: 'your bet is above the allowed maximum ({max} {pointsName}).',
    NoInput: 'please name an amount, or ask the streamer to set a Default bet.',
    addictedAlreadyOnList: '@{user}, {target} is already on the addicted list.',
    addictedAdded: '@{user}, {target} has been added to the addicted list.',
    addictedNotOnList: '@{user}, {target} is not on the addicted list.',
    addictedRemoved: '@{user}, {target} has been removed from the addicted list.',
    addictedUsage: '@{user}, usage: !gambleaddict add <user> or !gambleaddict remove <user>',
  };

  const fill = (text, values) => text.replace(/\{(\w+)\}/g, (all, key) => key in values ? values[key] : all);

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

  /* ---------- C#'s numbers ---------- */

  const INT_MAX = 2147483647;
  const INT_MIN = -2147483648;
  // C#'s long goes further, but a JavaScript number counts whole numbers exactly only this far
  const LONG_MAX = Number.MAX_SAFE_INTEGER;

  // Math.Round in C#: a half goes to the even neighbour
  const roundEven = x => (Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : Math.round(x));
  // ToLong: cut to a whole number, NaN as 0, held within a long
  const toLong = x => (Number.isNaN(x) ? 0 : x >= LONG_MAX ? LONG_MAX : x <= -LONG_MAX ? -LONG_MAX : Math.trunc(x) || 0);
  const toInt = x => Math.max(INT_MIN, Math.min(INT_MAX, x));
  const addClamped = (value, delta) => (value > LONG_MAX - delta ? LONG_MAX : value + delta);

  // int.TryParse: digits with an optional sign and nothing else, within an int; null when it fails
  function parseInt32(text) {
    if (!/^[+-]?\d+$/.test(text)) return null;
    const value = Number(text) || 0;
    return value >= INT_MIN && value <= INT_MAX ? value : null;
  }

  // TryParseInvariantDouble: "1.5", "1,5", ".5", "2e3", with an optional sign; null when it fails
  function parseDouble(text) {
    const normalized = text.trim().replace(/,/g, '.');
    return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(normalized) ? Number(normalized) : null;
  }

  // TryParseShorthand: "10K", "2.5M", "1B", and "1BN"; null when it is none of them
  function parseShorthand(input) {
    const s = input.replace(/N+$/, '');
    const multiplier = { B: 1e9, M: 1e6, K: 1e3 }[s.slice(-1)];
    if (!multiplier) return null;
    const num = parseDouble(s.slice(0, -1));
    if (num === null || num < 0) return null;
    return toLong(roundEven(num * multiplier));
  }

  /* ---------- the gamble ---------- */

  function create(api) {
    let balance;
    let freeGameActive;
    let defaultBet;
    let previousDefaultBet;
    let freeGameNotified;
    let addictedUsers;
    let modNoted;

    function reset() {
      balance = USER_POINTS;
      freeGameActive = false;
      defaultBet = RULES.defaultBet;
      previousDefaultBet = RULES.defaultBet;
      freeGameNotified = [];
      addictedUsers = '';
      modNoted = false;
    }
    reset();

    const baseValues = user => ({
      user, currency: RULES.pointsName, pointsVar: RULES.pointsVar, pointsName: RULES.pointsName, suffix: RULES.platform,
    });

    function invalidBet(user, reason, extra = {}) {
      const values = { ...baseValues(user), ...extra };
      api.say(fill(MSG.invalidBet, { ...values, reason: fill(MSG[reason], values) }));
    }

    function withinBetLimits(user, amount) {
      if (RULES.minBet > 0 && amount < RULES.minBet) {
        invalidBet(user, 'BelowMinimum', { min: formatNumber(RULES.minBet) });
        return false;
      }
      if (RULES.maxBet > 0 && amount > RULES.maxBet) {
        invalidBet(user, 'AboveMaximum', { max: formatNumber(RULES.maxBet) });
        return false;
      }
      return true;
    }

    // the bet the word after !gamble asks for, or -1 when it is refused
    function determineBet(user, raw) {
      if (freeGameActive) return 0;
      const input = raw.trim().toUpperCase();
      let amount;
      if (!input) {
        if (defaultBet <= 0) { invalidBet(user, 'NoInput'); return -1; }
        amount = defaultBet;
      } else if (input === 'ALL') {
        amount = toInt(balance);
      } else if (input === 'HALF') {
        amount = toInt(Math.floor(balance / 2));
      } else if (input === 'QUARTER') {
        amount = toInt(Math.floor(balance / 4));
      } else if (input === 'THIRD') {
        amount = toInt(Math.floor(balance / 3));
      } else if (input === 'RANDOM') {
        if (balance <= 0) { invalidBet(user, 'InsufficientFunds'); return -1; }
        amount = 1 + Math.floor(Math.random() * Math.min(balance, INT_MAX - 1));
      } else if (input.endsWith('%')) {
        const pct = parseDouble(input.slice(0, -1));
        if (pct === null || pct < 0 || pct > 100) { invalidBet(user, 'NegativeAmount'); return -1; }
        amount = toInt(toLong(roundEven(balance * (pct / 100))));
      } else {
        const shorthand = parseShorthand(input);
        if (shorthand !== null) {
          if (shorthand > INT_MAX) { invalidBet(user, 'NegativeAmount'); return -1; }
          amount = shorthand;
        } else {
          amount = parseInt32(input);
          if (amount === null) { invalidBet(user, 'NegativeAmount'); return -1; }
        }
      }

      if (amount <= 0) { invalidBet(user, balance <= 0 ? 'InsufficientFunds' : 'NegativeAmount'); return -1; }
      if (amount > balance) { invalidBet(user, 'InsufficientFunds'); return -1; }
      if (!withinBetLimits(user, amount)) return -1;
      return amount;
    }

    const addictedList = () => addictedUsers.split(',').map(x => x.trim().toLowerCase()).filter(x => x.length > 0);
    const winMultiplier = () => RULES.rndMin + Math.random() * (RULES.rndMax - RULES.rndMin);

    // ProcessGambleResult: one roll decides, and a win is paid on top of the bet
    function gamble(user, input) {
      const isFree = freeGameActive;
      const bet = determineBet(user, input);
      if (bet < 0) return;

      const jackpotMulti = RULES.jackpotMultiplier <= 0 ? 1 : RULES.jackpotMultiplier;
      const roll = 1 + Math.floor(Math.random() * 10000);
      const jackpotThreshold = roundEven(RULES.jackpotPercent * 100);
      const winUpperBound = jackpotThreshold + roundEven(RULES.winPercent * 100);
      let outcome;
      let change;
      if (roll <= jackpotThreshold) {
        outcome = 'jackpot';
        change = toLong(bet * winMultiplier() * jackpotMulti);
      } else if (roll <= winUpperBound) {
        outcome = 'win';
        change = toLong(bet * winMultiplier());
      } else {
        outcome = 'loss';
        change = -bet;
      }

      // the addicted list cuts a win by the Addicted cut
      const isAddicted = addictedList().includes(user.toLowerCase());
      const roleMulti = isAddicted ? 1 - RULES.addictedPayoutCutPercent / 100 : 1;
      if (outcome !== 'loss' && roleMulti !== 1) change = toLong(roundEven(change * roleMulti));
      if (outcome !== 'loss' && change < 0) change = 0;

      const displayAmt = Math.abs(outcome === 'loss' ? bet : change);
      let newTotal = balance;
      if (outcome === 'loss') {
        if (!isFree && bet > 0) newTotal = balance - bet;
      } else if (!isFree && change > 0) {
        newTotal = addClamped(balance, change);
      }
      if (newTotal < 0) newTotal = 0;
      balance = newTotal;

      const values = {
        ...baseValues(user),
        amount: isFree ? '' : formatNumber(displayAmt),
        currentPoints: isFree ? '' : formatNumber(newTotal),
        addictedCut: String(RULES.addictedPayoutCutPercent),
      };
      let template;
      if (isFree) template = outcome === 'jackpot' ? MSG.freeGameJackpot : outcome === 'win' ? MSG.freeGameWin : MSG.freeGameLoss;
      else if (outcome === 'jackpot') template = isAddicted ? MSG.addictedJackpot : MSG.jackpot;
      else if (outcome === 'win') template = isAddicted ? MSG.addictedWin : MSG.win;
      else template = MSG.loss;
      api.say(fill(template, values));

      // in Free Game Mode each viewer hears about it once, after their first gamble
      if (isFree && !freeGameNotified.some(u => u.toLowerCase() === user.toLowerCase())) {
        freeGameNotified.push(user);
        api.say(fill(MSG.freeGame, baseValues(user)));
      }
      if (balance === 0 && !isFree) api.note('That was the last of the pretend Points: Start over fills them up again.');
    }

    /* ---------- the moderator commands ---------- */

    function noteModerator() {
      if (modNoted) return;
      modNoted = true;
      api.note('On stream !SetFreeGamble, !EndFreeGamble and !gambleaddict are for moderators; here you may use them.');
    }

    function startFreeGame() {
      noteModerator();
      if (freeGameActive) { api.note('Free Gamble Mode is already on, so the game leaves this alone.'); return; }
      previousDefaultBet = defaultBet;
      defaultBet = 0;
      freeGameActive = true;
      freeGameNotified = [];
      api.say(MSG.freeGameStart);
    }

    function endFreeGame() {
      noteModerator();
      if (!freeGameActive) { api.note('Free Gamble Mode is not on, so the game leaves this alone.'); return; }
      const restore = Math.max(0, previousDefaultBet);
      defaultBet = restore;
      previousDefaultBet = restore;
      freeGameActive = false;
      freeGameNotified = [];
      api.say(MSG.freeGameEnd);
    }

    // !gambleaddict [add|remove] <user>: a name alone is added
    function manageAddicted(user, args) {
      noteModerator();
      const input0 = (args[0] || '').trim().toLowerCase();
      const input1 = (args[1] || '').trim().toLowerCase();
      const named = input0 === 'add' || input0 === 'remove';
      const action = named ? input0 : 'add';
      const target = (named ? input1 : input0).replace(/^@+/, '');
      const say = template => api.say(fill(template, { user, target }));
      if (!target.trim()) { say(MSG.addictedUsage); return; }

      const list = addictedList();
      if (action === 'add') {
        if (list.includes(target)) { say(MSG.addictedAlreadyOnList); return; }
        list.push(target);
        addictedUsers = list.join(',');
        say(MSG.addictedAdded);
      } else {
        if (!list.includes(target)) { say(MSG.addictedNotOnList); return; }
        list.splice(list.indexOf(target), 1);
        addictedUsers = list.join(',');
        say(MSG.addictedRemoved);
      }
    }

    /* ---------- chat ---------- */

    function handle(user, text) {
      const [word, ...rest] = text.trim().split(/\s+/);
      const command = word.toLowerCase();
      if (command === '!gamble' || command === '!gambel') gamble(user, rest[0] || '');
      else if (command === '!setfreegamble') startFreeGame();
      else if (command === '!endfreegamble') endFreeGame();
      else if (command === '!gambleaddict') manageAddicted(user, rest);
    }

    return {
      handle, reset,
      overlay: () => ({ active: false }),
      get balance() { return balance; },
      get freeGame() { return freeGameActive; },
    };
  }

  window.PlaygroundGames = window.PlaygroundGames || {};
  window.PlaygroundGames['Classic-Chat-Gamble'] = {
    welcome: 'You are "viewer" with 10.000 pretend Points. Gamble with !gamble and a bet: a number, 10k, 50%, all, half, third, quarter or random. The moderator commands !SetFreeGamble, !EndFreeGamble and !gambleaddict <name> work for you here.',
    note: 'The game\'s default settings and its own chat lines: 30% of gambles win 1.5× to 2.5× the bet on top, 1% hit a jackpot 43 times that.',
    quick: engine => engine.freeGame
      ? ['!gamble', '!gamble all', '!EndFreeGamble']
      : ['!gamble', '!gamble 1k', '!gamble 50%', '!gamble all', '!SetFreeGamble'],
    create,
  };
})();
