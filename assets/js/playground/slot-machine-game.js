/*
 * Slot Machine Game's rules for the playground (see assets/js/playground.js): !spin and !slots as
 * SlotMachineGame.cs plays them with its default settings, its chat lines word for word, and the
 * Jackpool that lost bets feed. Points are pretend: a balance of 10.000 that "Start over" fills
 * again, with an empty Jackpool. The reels show the game's default YouTube emotes, fruit with the
 * same weights as Kappa, PogChamp and the rest on Twitch, because this chat can't draw Twitch
 * emotes. Free mode, channel points, boosts and the Addicted list are the streamer's settings and
 * stay in the real game; the command has no cooldown by default.
 */
(() => {
  'use strict';

  const USER_POINTS = 10000;
  const RULES = {
    pointsName: 'Points',
    separator: '.',
    defaultBet: 1234,
    minBet: 1,
    maxBet: 9999999,
    numberOfSlots: 4,
    emotePoolSize: 10,
    minEmoteWeight: 1,
    maxEmoteWeight: 10,
    // A spin lands every slot alike first, at AllowJackpotChance. Of the others, AllowMatchChance
    // draw their slots freely; the rest draw a repeat again, up to RerollAttempts draws in all.
    allowJackpotChance: 0.01,
    allowMatchChance: 0.18,
    rerollAttempts: 2,
    // the payout in % of the bet for 2 to 6 alike, times the emote's weight ÷ 100; every slot
    // alike is the jackpot and pays the six row, whatever the number of slots
    payouts: { 2: 150, 3: 300, 4: 500, 5: 1000, 6: 1500 },
    useJackpotPool: true,
    jackpotBet: 50000,
  };

  // the default YouTube emotes: a low weight comes up often and pays little, a high one is rare and pays more
  const EMOTES = [
    ['Grapes', '🍇'], ['Melon', '🍈'], ['Watermelon', '🍉'], ['Tangerine', '🍊'], ['Lemon', '🍋'],
    ['Banana', '🍌'], ['Pineapple', '🍍'], ['Red Apple', '🍎'], ['Green Apple', '🍏'], ['Peach', '🍑'],
  ].map(([name, code], i) => ({ name, code, weight: i + 1 }));

  // SlotMachineGame.cs's default chat lines
  const MSG = {
    win: '@{user}, you WON! {amount} {currency}! 🎉🎉{jackpot} (Min. bet for the Jackpool: {jackpotMinBet} {currency}){/jackpot} -- Your new balance: {newBalance} {currency}',
    loss: '@{user}, you LOST! Better luck next time!{jackpot} 💸 {jackpotLossContribution} {currency} got added to the Jackpool of now {jackpotPoolCurrent} {currency}!{/jackpot} -- Your new balance: {newBalance} {currency}',
    jackpot: '🔥 J A C K P O T 🔥 @{user}, YOU WON {amount} {currency}{jackpot} + {jackpotPoolWinAmount} {currency} from the Jackpool!{/jackpot} -- Your new balance: {newBalance} {currency}',
    invalidBet: '❌ @{user}, {reason}',
    NegativeAmount: 'no decimals, negative, invalid or too large amounts.',
    InsufficientFunds: "you don't have enough {currency}.",
    BelowMinimum: 'your bet is below the minimum ({min} {currency}).',
    AboveMaximum: 'your bet is above the maximum ({max} {currency}).',
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

  // Math.Round in C#: a half goes to the even neighbour
  const roundEven = x => (Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : Math.round(x));

  // int.TryParse: digits with an optional sign and nothing else, within an int; null when it fails
  function parseInt32(text) {
    if (!/^[+-]?\d+$/.test(text)) return null;
    const value = Number(text) || 0;
    return value >= -2147483648 && value <= 2147483647 ? value : null;
  }

  // ToBet: a balance as a bet, from 0 up to the largest int
  const toBet = points => Math.max(0, Math.min(points, 2147483647));

  // {jackpot}…{/jackpot} reaches chat only while the Jackpool is in the message
  function applyJackpotBlock(template, pool) {
    if (pool) return template.replace(/\{\/?jackpot\}/g, '');
    return template.replace(/\{jackpot\}[\s\S]*?\{\/jackpot\}/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  }

  /* ---------- the reels ---------- */

  // the emotes in play, in a new order every spin, as many as EmotePoolSize allows
  function emotePool() {
    const inPlay = EMOTES.filter(e => e.weight >= RULES.minEmoteWeight && e.weight <= RULES.maxEmoteWeight);
    for (let i = inPlay.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [inPlay[i], inPlay[j]] = [inPlay[j], inPlay[i]];
    }
    const pool = RULES.emotePoolSize > 0 && RULES.emotePoolSize <= inPlay.length ? inPlay.slice(0, RULES.emotePoolSize) : inPlay;
    return pool.length ? pool : EMOTES.slice();
  }

  // GetWeightedRandomEmoteInverted: an emote comes up by the square root of (top weight + 1 - its weight)
  function pick(pool) {
    const maxWeight = Math.max(...pool.map(e => e.weight));
    const odds = pool.map(e => Math.pow(maxWeight + 1 - e.weight, 0.5));
    const total = odds.reduce((sum, o) => sum + o, 0);
    const roll = Math.random() * total;
    let reach = 0;
    for (let i = 0; i < pool.length; i++) {
      reach += odds[i];
      if (roll < reach) return pool[i];
    }
    return pool[0];
  }

  function spinReels(pool) {
    const reels = [];
    const jackpot = Math.random() < RULES.allowJackpotChance;
    const allowMatches = !jackpot && Math.random() < RULES.allowMatchChance;
    if (jackpot) {
      const emote = pick(pool);
      for (let i = 0; i < RULES.numberOfSlots; i++) reels.push(emote);
      return reels;
    }
    for (let i = 0; i < RULES.numberOfSlots; i++) {
      const onReels = code => reels.some(e => e.code === code);
      let emote;
      if (allowMatches || pool.every(p => onReels(p.code))) {
        emote = pick(pool);
      } else {
        // a repeat is drawn again, up to RerollAttempts draws in all
        let attempt = 0;
        do {
          emote = pick(pool);
          attempt++;
        } while (i > 0 && onReels(emote.code) && attempt < RULES.rerollAttempts);
      }
      reels.push(emote);
    }
    return reels;
  }

  /* ---------- the slot machine ---------- */

  function create(api) {
    let balance;
    let jackpool;

    function reset() {
      balance = USER_POINTS;
      jackpool = 0;
    }
    reset();

    function invalidBet(user, reason, amount, extra = {}) {
      const values = { user, amount: formatNumber(amount), currency: RULES.pointsName, ...extra };
      api.say(fill(MSG.invalidBet, { ...values, reason: fill(MSG[reason], values) }));
    }

    // the bet the word after !spin asks for, or -1 when it is refused
    function determineBet(user, input) {
      let amount;
      switch (input) {
        case '':
          amount = RULES.defaultBet;
          break;
        case 'all':
        case 'alles':
        case 'all in':
          amount = toBet(balance);
          break;
        case 'half':
        case 'hälfte':
        case '50%':
          amount = toBet(Math.floor(balance / 2));
          break;
        case 'third':
        case 'drittel':
        case '33%':
          amount = toBet(Math.floor(balance / 3));
          break;
        case 'quarter':
        case 'viertel':
        case '25%':
          amount = toBet(Math.floor(balance / 4));
          break;
        case 'random':
        case 'zufall':
        case 'rnd': {
          const points = toBet(balance);
          const minBet = RULES.minBet > 0 ? RULES.minBet : 1;
          const maxBet = RULES.maxBet > 0 ? RULES.maxBet : points;
          const upperBound = Math.min(maxBet, points);
          amount = upperBound >= minBet ? minBet + Math.floor(Math.random() * (upperBound - minBet + 1)) : points;
          break;
        }
        default:
          amount = parseInt32(input);
          if (amount === null) {
            invalidBet(user, 'NegativeAmount', 0);
            return -1;
          }
      }

      if (amount < 0) amount = 0;
      if (amount <= 0 && balance > 0) { invalidBet(user, 'NegativeAmount', amount); return -1; }
      if (amount > balance) { invalidBet(user, 'InsufficientFunds', amount); return -1; }
      if (RULES.minBet > 0 && amount < RULES.minBet) {
        invalidBet(user, 'BelowMinimum', amount, { min: formatNumber(RULES.minBet) });
        return -1;
      }
      if (RULES.maxBet > 0 && amount > RULES.maxBet) {
        invalidBet(user, 'AboveMaximum', amount, { max: formatNumber(RULES.maxBet) });
        return -1;
      }
      return amount;
    }

    // CalculateWinnings: the biggest group of alike emotes pays (the first one on the reels when
    // two are as big), by its size and its emote's weight; a jackpot big enough takes the Jackpool too
    function settle(reels, bet) {
      const groups = new Map();
      for (const emote of reels) {
        const group = groups.get(emote.code);
        if (group) group.count++;
        else groups.set(emote.code, { emote, count: 1 });
      }
      let best = null;
      for (const group of groups.values()) if (!best || group.count > best.count) best = group;

      const result = { reels, matchCount: best.count, win: false, jackpot: false, payout: 0, poolWon: 0 };
      if (best.count < 2) return result;
      result.win = true;
      let multiplier = RULES.payouts[best.count] || RULES.payouts[2];
      if (best.count === RULES.numberOfSlots) {
        result.jackpot = true;
        multiplier = RULES.payouts[6];
      }
      const rawPayout = bet * multiplier * best.emote.weight / 100;
      result.payout = Math.max(roundEven(rawPayout), bet);
      if (result.jackpot && RULES.useJackpotPool && bet >= RULES.jackpotBet) {
        result.payout += jackpool;
        result.poolWon = jackpool;
        jackpool = 0;
      }
      return result;
    }

    // SendSlotResult: the reels, then the result; a lost bet goes into the Jackpool
    function sendResult(user, result, bet) {
      const slots = result.reels.map(e => e.code).join(' || ');
      const feedsPool = !result.win && bet > 0;
      const poolInText = RULES.useJackpotPool && (result.win || feedsPool);
      const values = {
        user,
        slots,
        amount: formatNumber(result.win ? result.payout - result.poolWon : bet),
        newBalance: formatNumber(balance),
        currency: RULES.pointsName,
      };
      if (RULES.useJackpotPool) {
        if (feedsPool) jackpool += bet;
        values.jackpotMinBet = formatNumber(RULES.jackpotBet);
        values.jackpotLossContribution = feedsPool ? formatNumber(bet) : '';
        values.jackpotPoolCurrent = formatNumber(jackpool);
        values.jackpotPoolWinAmount = result.poolWon > 0 ? formatNumber(result.poolWon) : '';
      }
      const template = result.jackpot ? MSG.jackpot : result.win ? MSG.win : MSG.loss;
      let text = fill(applyJackpotBlock(template, poolInText), values);
      if (!poolInText) text = text.replace(/\{(jackpotMinBet|jackpotLossContribution|jackpotPoolCurrent|jackpotPoolWinAmount)\}/g, '');
      api.say(slots);
      api.say(text);
    }

    function spin(user, input) {
      const bet = determineBet(user, input);
      if (bet < 0) return;
      const result = settle(spinReels(emotePool()), bet);
      balance = balance - bet + (result.win ? result.payout : 0);
      sendResult(user, result, bet);
      if (balance === 0) api.note('That was the last of the pretend Points: Start over fills them up again.');
    }

    /* ---------- chat ---------- */

    function handle(user, text) {
      const [word, ...rest] = text.trim().split(/\s+/);
      const command = word.toLowerCase();
      if (command === '!spin' || command === '!slots') spin(user, (rest[0] || '').toLowerCase());
    }

    return {
      handle, reset,
      overlay: () => ({ active: false }),
      get balance() { return balance; },
      get jackpool() { return jackpool; },
    };
  }

  window.PlaygroundGames = window.PlaygroundGames || {};
  window.PlaygroundGames['Slot-Machine-Game'] = {
    welcome: 'You are "viewer" with 10.000 pretend Points. Spin with !spin or !slots and a bet: a number, all, half, third, quarter or random. Two alike win, all four hit the jackpot.',
    note: 'The game\'s default settings and its own chat lines. The reels show its YouTube emotes: fruit with the same weights as Kappa, PogChamp and the rest on Twitch.',
    quick: () => ['!spin', '!spin 500', '!spin half', '!spin all'],
    create,
  };
})();
