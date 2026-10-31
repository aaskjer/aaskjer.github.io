/*
 * RhymeTime's rules for the playground (see assets/js/playground.js): the single-player round
 * (!Rhyme) and the battle (!RhymeBattle), as RhymeTime Game.cs and RhymeTime Battle.cs play them
 * with their default settings, their chat lines word for word, and the overlay messages they
 * broadcast. The one setting that differs is the overlay itself, which a fresh install keeps off.
 * Points are pretend: a balance of 10.000 that "Start over" fills again. The word banks are the
 * three the game ships, whole, though the default difficulty only ever draws from the medium one.
 * Two things stay out of the browser: the dictionary the game asks wordotron.com, which a
 * letters-only test stands in for, and the moderators-only rule of a battle, which the visitor
 * is let past with a note.
 */
(() => {
  'use strict';

  const USER_POINTS = 10000;
  const PLATFORM = 'twitch';
  const INT_MAX = 2147483647;
  const RULES = {
    pointsName: 'Points',
    separator: '.',
    defaultBet: 100,
    minBet: 10,
    maxBet: 10000,
    timeLimit: 30,
    maxAttempts: 3,
    // easy, medium, hard or random
    difficulty: 'medium',
    multipliers: { easy: 1.5, medium: 2.0, hard: 3.0 },
    checkRealWords: true,
    battleReward: 500,
    // !Rhyme's cooldowns, which the settings window puts on the command
    globalCooldown: 10,
    userCooldown: 30,
    // !RhymeBattle keeps the ones it was imported with
    battleGlobalCooldown: 10,
    battleUserCooldown: 30,
  };
  // DefaultBet 0 makes every round free
  const FREE = RULES.defaultBet === 0;

  // RhymeTime's default chat lines
  const MSG = {
    globalCooldown: 'Please wait {seconds} seconds before trying again ⏳',
    userCooldown: '@{user}, please wait {seconds} seconds before trying again ⏳',
    start: '{user}, find a rhyme for: {word}! You have {timeLimit} seconds. Bet: {amount} {currency}',
    win: "{user} rhymed '{word}' with '{guess}'! +{winAmount} {currency} [Total: {currentPoints} {currency}]",
    lose: "{user} couldn't find a rhyme for '{word}' in time! -{amount} {currency} [Total: {currentPoints} {currency}]",
    failedAttempt: "@{user}, '{guess}' doesn't rhyme with '{word}'! {attempts}/{maxAttempts} attempts used.",
    maxAttemptsLose: "{user} used all {maxAttempts} attempts on '{word}'! -{amount} {currency} [Total: {currentPoints} {currency}]",
    educational: 'Examples: {examples}',
    invalidBet: '{user}, {reason}',
    alreadyPlaying: '{user}, you already have an active round!',
    noWords: '{user}, there are no words in the {difficulty} word bank yet.',
    reasonNegativeAmount: 'please specify a valid bet amount greater than 0.',
    reasonInsufficientFunds: "you don't have enough {currency}.",
    reasonBelowMinimum: 'minimum bet is {min} {currency}.',
    reasonAboveMaximum: 'maximum bet is {max} {currency}.',
    battleStart: "⚔️ BATTLE TIME! First to rhyme with '{word}' wins {reward} {currency}! You have {timeLimit}s!",
    battleWin: "🏆 {winner} won the battle by rhyming '{word}' with '{guess}'! +{reward} {currency} (Total: {currentPoints} {currency})",
    battleTimeout: "⏰ Nobody rhymed with '{word}' in time! Some valid rhymes: {examples}",
    battleAlreadyActive: '⚔️ A battle is already in progress! Type your rhyme in chat!',
  };

  // The Overlay page of the settings window at its defaults, switched on. STYLE is OverlayStyle(),
  // the look that travels with every round.
  const OVERLAY = { enabled: true, resultSeconds: 8, showEnding: true, showAttempts: true, showStake: true, showExamples: true };
  const STYLE = { position: 'left', scale: 100, accent: '#F97316', battle: '#FB7185', win: '#86EFAC', card: '#160E10', cardOpacity: 78, glow: true };

  // The card shows a round until it ends and its result for resultSeconds after that, counted from
  // when the overlay gets it: a beat after it is sent.
  const RESULT_LAG_MS = 400;

  // WordBank.CreateDefaultWordBank. A target with a space in it is a line to finish.
  const bank = list => list.map(([word, rhymes]) => ({ word, rhymes }));
  const BANK = {
    easy: bank([
      ['CAT', 'BAT,HAT,MAT,RAT,SAT,FAT,PAT,FLAT,CHAT,THAT'],
      ['GAME', 'FAME,NAME,SAME,BLAME,CAME,FLAME,FRAME,SHAME,TAME,CLAIM'],
      ['LIGHT', 'NIGHT,SIGHT,FIGHT,RIGHT,MIGHT,BRIGHT,FLIGHT,TIGHT,HEIGHT,SLIGHT'],
      ['PLAY', 'DAY,SAY,WAY,MAY,STAY,PAY,LAY,GRAY,PRAY,DELAY'],
      ['LOVE', 'DOVE,ABOVE,GLOVE,SHOVE,THEREOF'],
      ['KING', 'RING,SING,BRING,THING,WING,STRING,SPRING,SWING,STING,CLING'],
      ['TREE', 'SEE,BEE,FREE,THREE,KEY,AGREE,DEGREE,FLEE,KNEE,TEA'],
      ['STAR', 'CAR,FAR,BAR,JAR,SCAR,GUITAR,CIGAR,AVATAR,BIZARRE'],
      ['STAR LIGHT STAR BRIGHT ...', 'FIRST STAR I SEE TONIGHT'],
      ['ROSES ARE RED VIOLETS ARE BLUE ...', 'SUGAR IS SWEET AND SO ARE YOU'],
      ['JACK AND JILL WENT UP THE HILL ...', 'TO FETCH A PAIL OF WATER'],
      ['TWINKLE TWINKLE LITTLE STAR ...', 'HOW I WONDER WHAT YOU ARE'],
      ['HUMPTY DUMPTY SAT ON A WALL ...', 'HUMPTY DUMPTY HAD A GREAT FALL'],
      ['WITH GREAT POWER ...', 'COMES GREAT RESPONSIBILITY'],
    ]),
    medium: bank([
      ['STREAM', 'DREAM,TEAM,THEME,CREAM,BEAM,GLEAM,SCHEME,SUPREME,EXTREME,REGIME'],
      ['VICTORY', 'HISTORY,MYSTERY,MISERY,DELIVERY,DISCOVERY'],
      ['BATTLE', 'CATTLE,RATTLE,SEATTLE,PRATTLE,TATTLE'],
      ['GAMING', 'NAMING,CLAIMING,FRAMING,BLAMING,SHAMING,TAMING,AIMING,FLAMING'],
      ['POWER', 'HOUR,TOWER,FLOWER,SHOWER,DEVOUR,SOUR'],
      ['NOTIFICATION', 'VACATION,STATION,NATION,CREATION,EDUCATION,FOUNDATION,POPULATION,SENSATION'],
      ['CONTROLLER', 'ROLLER,STROLLER,BOWLER,PATROLLER'],
      ['CHAMPION', 'MANSION,FASHION,PASSION,EXPANSION,COMPASSION'],
      ['TO BE OR NOT TO BE ...', 'THAT IS THE QUESTION'],
      ['ALL THAT GLITTERS IS NOT GOLD ...', 'OFTEN HAVE YOU HEARD THAT TOLD'],
      ['PETER PIPER PICKED A PECK OF PICKLED PEPPERS ...', 'A PECK OF PICKLED PEPPERS PETER PIPER PICKED'],
      ['SHE SELLS SEASHELLS BY THE SEASHORE ...', 'THE SHELLS SHE SELLS ARE SURELY SEASHELLS'],
      ['HOW MUCH WOOD WOULD A WOODCHUCK CHUCK ...', 'IF A WOODCHUCK COULD CHUCK WOOD'],
    ]),
    hard: bank([
      ['SUBSCRIBE', 'TRIBE,BRIBE,DESCRIBE,PRESCRIBE,VIBE'],
      ['ALGORITHM', 'RHYTHM,PRISM,SCHISM'],
      ['MOMENTUM', 'CONTINUUM,SPECTRUM,QUANTUM,DRUM,SUM'],
      ['PHENOMENON', 'MARATHON,PENTAGON,PARAGON,OCTAGON'],
      ['ORCHESTRA', 'EXTRA,SPECTRA,TUNDRA,MANTRA'],
      ['SILHOUETTE', 'ROULETTE,CASSETTE,BAGUETTE,REGRET,SUNSET'],
      ['ENTREPRENEUR', 'CONNOISSEUR,SABOTEUR,AMATEUR,PROVOCATEUR'],
      ['LABYRINTH', 'ZENITH,MONOLITH,MEGALITH'],
      ['A JOURNEY OF A THOUSAND MILES ...', 'BEGINS WITH A SINGLE STEP'],
      ['THE EARLY BIRD CATCHES THE WORM ...', 'BUT THE SECOND MOUSE GETS THE CHEESE'],
      ['ASHES TO ASHES ...', 'DUST TO DUST'],
      ['WHAT DOESNT KILL YOU ...', 'MAKES YOU STRONGER'],
    ]),
  };

  /* ---------- the C# basics ---------- */

  // String.Trim, with the whitespace .NET knows
  const WS = '[\\t-\\r \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]';
  const EDGES = new RegExp(`^${WS}+|${WS}+$`, 'g');
  const trim = text => String(text == null ? '' : text).replace(EDGES, '');

  // ToUpperInvariant: letter for letter, so ß stays ß instead of growing into SS
  const upper = text => Array.from(text, c => {
    const u = c.toUpperCase();
    return u.length === c.length ? u : c;
  }).join('');

  // FormatTemplate: each value in turn, everywhere it appears
  const fill = (template, values) => Object.keys(values).reduce(
    (text, key) => text.split(`{${key}}`).join(values[key] == null ? '' : String(values[key])), template || '');

  // 1234567 → "1.234.567", as FormatNumber with the "." separator
  function formatNumber(value) {
    const digits = String(Math.abs(Math.trunc(value)));
    let out = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) out += RULES.separator;
      out += digits[i];
    }
    return (value < 0 ? '-' : '') + out;
  }

  // Next: 0 up to, not including, the bound
  const next = bound => bound <= 1 ? 0 : Math.floor(Math.random() * bound);

  // int.TryParse with NumberStyles.Integer: digits and a sign, inside an int, or null
  function parseInt32(text) {
    const match = /^([+-]?)0*(\d+)$/.exec(text);
    if (!match || match[2].length > 10) return null;
    const value = Number(match[1] + match[2]);
    return value >= -INT_MAX - 1 && value <= INT_MAX ? value : null;
  }

  const multiplier = difficulty => {
    const key = String(difficulty || '').toLowerCase();
    return key === 'easy' ? RULES.multipliers.easy : key === 'hard' ? RULES.multipliers.hard : RULES.multipliers.medium;
  };

  /* ---------- words and rhymes ---------- */

  const isSentence = entry => entry.word != null && trim(entry.word).includes(' ');

  // RhymesArray: a line's answers keep their spaces, so only commas and semicolons part them
  function rhymesOf(entry) {
    if (!trim(entry.rhymes)) return [];
    return entry.rhymes.split(isSentence(entry) ? /[,;]/ : /[,; ]/)
      .filter(r => r.length).map(r => upper(trim(r))).filter(r => r.length);
  }

  const pool = difficulty => {
    const key = trim(difficulty).toLowerCase();
    return ['easy', 'medium', 'hard'].includes(key) ? BANK[key] : null;
  };
  const usable = entries => (entries || []).filter(e => e && trim(e.word) && rhymesOf(e).length > 0);

  // The longest endings the listed rhymes agree on, so a word nobody listed still counts when it
  // ends the same way. One listed rhyme has no agreement to find, so half of it is used.
  function extractSuffixes(rhymes, minLen = 2) {
    if (!rhymes || !rhymes.length) return [];
    if (rhymes.length === 1) {
      const only = rhymes[0];
      const take = Math.min(Math.max(minLen, Math.trunc(only.length / 2)), only.length);
      return [only.slice(only.length - take)];
    }

    const votes = new Map();
    for (let i = 0; i < rhymes.length; i++) {
      for (let j = i + 1; j < rhymes.length; j++) {
        const a = rhymes[i];
        const b = rhymes[j];
        let len = 0;
        while (len < a.length && len < b.length && a[a.length - 1 - len] === b[b.length - 1 - len]) len++;
        if (len < minLen) continue;
        const suffix = a.slice(a.length - len);
        votes.set(suffix, (votes.get(suffix) || 0) + 1);
      }
    }

    if (!votes.size) {
      return [...new Set(rhymes.map(r => r.length >= minLen ? r.slice(r.length - Math.max(minLen, Math.trunc(r.length / 2))) : r))];
    }

    const threshold = Math.max(1, Math.trunc(rhymes.length / 3));
    const accepted = [...votes].filter(([, n]) => n >= threshold).sort((x, y) => y[0].length - x[0].length).map(([s]) => s);
    const result = [];
    for (const s of accepted) if (!result.some(r => r.endsWith(s))) result.push(s);
    return result.length ? result : [[...votes].sort((x, y) => y[1] - x[1])[0][0]];
  }

  // The ending the card shows under the word: the one most of the listed rhymes share, and the
  // longest of those when several are shared equally.
  function overlayEnding(rhymes, suffixes) {
    let best = '';
    let bestVotes = -1;
    for (const suffix of suffixes) {
      const votes = rhymes.filter(r => r.endsWith(suffix)).length;
      if (votes > bestVotes || (votes === bestVotes && suffix.length > best.length)) {
        best = suffix;
        bestVotes = votes;
      }
    }
    return best;
  }

  // The last word of the message, or for a line to finish all of it without its punctuation.
  function readGuess(rawInput, sentenceMode) {
    if (sentenceMode) return upper(trim(rawInput.replace(/\p{P}/gu, '')));
    const parts = trim(rawInput).split(' ').filter(p => p.length);
    return parts.length ? upper(parts[parts.length - 1]) : '';
  }

  // IsRealWord asks wordotron.com, and lets the word through when the answer is slow or missing.
  // Nothing leaves the playground, so plain letters with a vowel among them stand in for it.
  const isRealWord = word => !RULES.checkRealWords || (/^[A-Z]+$/.test(word) && /[AEIOUY]/.test(word));

  function isValidRhyme(guess, word) {
    if (word.sentence) return word.examples.includes(guess);
    if (guess === upper(word.target)) return false;
    if (word.examples.includes(guess)) return true;
    if (!word.suffixes.length) return false;
    const suffixMatch = word.suffixes.some(s => s.length > 0 && guess.length >= s.length && guess.endsWith(s));
    return suffixMatch && isRealWord(guess);
  }

  // Close enough to be a try: it ends in the last two letters of an accepted ending. On a line to
  // finish, everything is a try.
  const looksLikeAttempt = (guess, word) => word.sentence || word.suffixes.some(s => s.length >= 2 && guess.endsWith(s.slice(-2)));

  /* ---------- the game ---------- */

  function create(api) {
    let balance;
    let round;      // the viewer's round, as _activeRounds holds it
    let battle;     // the battle on this platform
    let fired;      // when each command last went off, for Streamer.bot's cooldowns
    let battleNoted;
    let latest;     // the last overlay message broadcast
    // _overlayRounds, one per script; it keeps counting through "Start over", so an old card
    // still on the overlay never shares its id with a new round
    let rounds = 0;
    let battles = 0;
    const timers = new Set();

    function later(fn, ms) {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    }

    function cancel(id) {
      clearTimeout(id);
      timers.delete(id);
    }

    function reset() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
      balance = USER_POINTS;
      round = null;
      battle = null;
      fired = { rhyme: -Infinity, battle: -Infinity };
      battleNoted = false;
      latest = null;
    }
    reset();

    // SendMessage: a blank line is never posted
    function send(text) {
      if (trim(text)) api.say(text);
    }

    function overlay() {
      return latest && JSON.parse(JSON.stringify(latest));
    }

    /* ---------- the overlay ---------- */

    // PublishOverlay and Stamp. The game posts its chat line a moment before the overlay message;
    // here both go out in one frame, so the message comes first in the code.
    function publish(message) {
      message.game = 'rhymetime';
      message.v = 1;
      message.platform = PLATFORM;
      message.sentAt = Date.now();
      latest = JSON.parse(JSON.stringify(message));
    }

    function publishStart(word, mode, player, seconds) {
      if (!OVERLAY.enabled) return;
      const start = {
        type: 'round_start',
        roundId: word.roundId,
        mode,
        player,
        word: word.target,
        ending: word.ending,
        sentence: word.sentence,
        showEnding: OVERLAY.showEnding,
        difficulty: word.difficulty,
      };
      if (mode === 'solo') start.multiplier = multiplier(word.difficulty).toFixed(1);
      Object.assign(start, {
        pointsName: RULES.pointsName,
        seconds,
        endsAt: word.endsAt,
        attempts: 0,
        // no dots on the card means no count to send either, and a battle has nobody's to count
        maxAttempts: mode === 'solo' && OVERLAY.showAttempts ? Math.max(0, RULES.maxAttempts) : 0,
        style: { ...STYLE },
      });
      if (mode === 'solo' && OVERLAY.showStake && !FREE && word.bet > 0) start.bet = formatNumber(word.bet);
      if (mode === 'battle' && OVERLAY.showStake && word.reward > 0) start.reward = formatNumber(word.reward);
      word.overlay = start;
      publish(start);
    }

    // Only the count goes out; the round itself keeps it for the end.
    function publishAttempt(word, attempts) {
      if (!OVERLAY.enabled || !OVERLAY.showAttempts || !word.overlay) return;
      word.overlay.attempts = attempts;
      publish({ type: 'attempt', roundId: word.roundId, attempts });
    }

    // The end carries the round with it. A solo round shows five examples, a battle four.
    function publishEnd(word, reason, guess, amount, total, winner, examples) {
      if (!OVERLAY.enabled || !word.overlay) return;
      const end = JSON.parse(JSON.stringify(word.overlay));
      word.overlay = null;
      end.type = 'round_end';
      end.reason = reason;
      end.resultSeconds = Math.max(1, OVERLAY.resultSeconds);
      end.winner = reason === 'win' ? winner : null;
      end.guess = guess;
      if (amount > 0) {
        end.amount = formatNumber(amount);
        end.total = formatNumber(total);
      }
      if (reason !== 'win' && OVERLAY.showExamples) end.examples = word.examples.slice(0, examples);
      publish(end);
      // once the result is off the card, the playground looks again and shows its idle text
      later(() => api.draw(), end.resultSeconds * 1000 + RESULT_LAG_MS + 100);
    }

    /* ---------- a word for a round ---------- */

    function pickWord(user) {
      let difficulty = trim(RULES.difficulty || 'medium').toLowerCase();
      let entries;
      if (difficulty === 'random') {
        const pools = ['easy', 'medium', 'hard'].map(name => [name, usable(pool(name))]).filter(([, list]) => list.length > 0);
        if (!pools.length) { noWords(user, 'any'); return null; }
        [difficulty, entries] = pools[next(pools.length)];
      } else {
        entries = usable(pool(difficulty));
        if (!entries.length) { noWords(user, difficulty); return null; }
      }
      const entry = entries[next(entries.length)];
      const examples = rhymesOf(entry);
      const suffixes = extractSuffixes(examples);
      return { target: entry.word, examples, suffixes, sentence: isSentence(entry), difficulty, ending: overlayEnding(examples, suffixes) };
    }

    function noWords(user, difficulty) {
      send(fill(MSG.noWords, { user: `@${user}`, difficulty }));
    }

    // For the quick buttons: a listed rhyme, and something that only counts as a try
    function answersFor(word, withMiss) {
      const hint = word.examples[next(word.examples.length)].toLowerCase();
      if (!withMiss) return [hint];
      if (word.sentence) return [hint, 'no idea'];
      const target = word.target.toLowerCase();
      return looksLikeAttempt(upper(target), word) ? [hint, target] : [hint];
    }

    /* ---------- bets ---------- */

    // DetermineBetAmount. A battle's differs in two places: no free mode, and no default bet means
    // no stake rather than a refusal.
    function determineBet(user, input, forBattle) {
      if (FREE && !forBattle) return 0;
      const betInput = trim(input) ? upper(trim(input)) : '';
      const affordable = Math.min(balance, INT_MAX);
      let amount;

      if (!betInput) {
        if (RULES.defaultBet <= 0) {
          if (forBattle) return 0;
          invalidBet(user, 'NegativeAmount');
          return -1;
        }
        amount = RULES.defaultBet;
      } else if (betInput === 'ALL') amount = affordable;
      else if (betInput === 'HALF') amount = Math.trunc(affordable / 2);
      else if (betInput === 'QUARTER') amount = Math.trunc(affordable / 4);
      else if (betInput === 'THIRD') amount = Math.trunc(affordable / 3);
      else if (betInput === 'RANDOM') amount = affordable < 1 ? 0 : 1 + next(Math.min(affordable, INT_MAX - 1));
      else {
        amount = parseInt32(betInput);
        if (amount === null) {
          invalidBet(user, 'NegativeAmount');
          return -1;
        }
      }

      if (amount <= 0) {
        invalidBet(user, 'NegativeAmount');
        return -1;
      }
      if (amount > balance) {
        invalidBet(user, 'InsufficientFunds');
        return -1;
      }
      if (RULES.minBet > 0 && amount < RULES.minBet) {
        invalidBet(user, 'BelowMinimum', { min: formatNumber(RULES.minBet) });
        return -1;
      }
      if (RULES.maxBet > 0 && amount > RULES.maxBet) {
        invalidBet(user, 'AboveMaximum', { max: formatNumber(RULES.maxBet) });
        return -1;
      }
      return amount;
    }

    function invalidBet(user, reasonKey, extra) {
      const reasons = {
        NegativeAmount: MSG.reasonNegativeAmount,
        InsufficientFunds: MSG.reasonInsufficientFunds,
        BelowMinimum: MSG.reasonBelowMinimum,
        AboveMaximum: MSG.reasonAboveMaximum,
      };
      const values = { user: `@${user}`, currency: RULES.pointsName, ...extra };
      values.reason = fill(reasons[reasonKey], values);
      send(fill(MSG.invalidBet, values));
    }

    // Streamer.bot's cooldowns: a command that goes off starts both, whatever the action makes of
    // it, and one typed too early runs the action with the seconds left instead.
    function cooldownLeft(command, globalSeconds, userSeconds) {
      const since = (Date.now() - fired[command]) / 1000;
      return { global: globalSeconds - since, user: userSeconds - since };
    }

    /* ---------- !Rhyme ---------- */

    function rhymeCommand(user, input) {
      const left = cooldownLeft('rhyme', RULES.globalCooldown, RULES.userCooldown);
      if (left.global > 0 || left.user > 0) {
        send(left.global > 0
          ? fill(MSG.globalCooldown, { seconds: Math.ceil(left.global) })
          : fill(MSG.userCooldown, { user, seconds: Math.ceil(left.user) }));
        return;
      }
      fired.rhyme = Date.now();

      if (round) {
        send(fill(MSG.alreadyPlaying, { user: `@${user}` }));
        return;
      }
      const bet = determineBet(user, input, false);
      if (bet < 0) return;
      startRound(user, bet);
    }

    function startRound(user, bet) {
      const word = pickWord(user);
      if (!word) return;
      const seconds = Math.max(1, RULES.timeLimit);
      const r = Object.assign(word, {
        user, bet, attempts: 0, roundId: `r${++rounds}`, endsAt: Date.now() + seconds * 1000, overlay: null,
      });
      r.answers = answersFor(r, true);
      r.timer = later(() => {
        if (claimRound(r)) roundLost(r, 'timeout');
      }, seconds * 1000);
      round = r;

      publishStart(r, 'solo', user, seconds);
      send(fill(MSG.start, {
        user, word: r.target, timeLimit: RULES.timeLimit, amount: FREE ? '0' : formatNumber(bet), currency: RULES.pointsName,
      }));
    }

    // Winning, running out of attempts and the clock all race for the round; whoever takes it pays.
    function claimRound(r) {
      if (round !== r) return false;
      round = null;
      cancel(r.timer);
      return true;
    }

    // A chat line from the player with a round
    function rhymeGuess(user, rawInput) {
      const r = round;
      if (!r || r.user !== user || !trim(rawInput)) return;
      const guess = readGuess(rawInput, r.sentence);
      if (!guess) return;

      if (isValidRhyme(guess, r)) {
        if (claimRound(r)) roundWon(r, guess);
        return;
      }
      // anything that does not even end the right way is chat, not a try
      if (!looksLikeAttempt(guess, r)) return;

      const attempts = ++r.attempts;
      if (attempts >= RULES.maxAttempts) {
        if (claimRound(r)) roundLost(r, 'maxAttempts');
        return;
      }
      publishAttempt(r, attempts);
      send(fill(MSG.failedAttempt, { user, guess, word: r.target, attempts, maxAttempts: RULES.maxAttempts }));
    }

    // The stake was never taken, so a win pays the stake times the multiplier on top.
    function roundWon(r, guess) {
      let current = balance;
      const winAmount = Math.trunc(r.bet * multiplier(r.difficulty));
      if (!FREE && winAmount > 0) {
        current += winAmount;
        balance = current;
      }
      publishEnd(r, 'win', guess, FREE ? 0 : winAmount, current, r.user, 5);
      send(fill(MSG.win, {
        user: `@${r.user}`, word: r.target, guess, winAmount: formatNumber(winAmount), currency: RULES.pointsName,
        currentPoints: formatNumber(current),
      }));
    }

    function roundLost(r, reason) {
      let current = balance;
      if (!FREE && r.bet > 0) {
        current = Math.max(0, current - r.bet);
        balance = current;
      }
      publishEnd(r, reason === 'maxAttempts' ? 'attempts' : 'timeout', null, FREE ? 0 : r.bet, current, null, 5);
      send(fill(reason === 'maxAttempts' ? MSG.maxAttemptsLose : MSG.lose, {
        user: `@${r.user}`, word: r.target, amount: formatNumber(r.bet), currency: RULES.pointsName,
        currentPoints: formatNumber(current), maxAttempts: RULES.maxAttempts,
      }));
      if (trim(MSG.educational)) send(fill(MSG.educational, { examples: r.examples.slice(0, 5).join(', ') }));
    }

    /* ---------- !RhymeBattle ---------- */

    function battleCommand(user, input) {
      if (!battleNoted) {
        battleNoted = true;
        api.note('On stream only moderators can open a battle, and the whole chat races for the word. Here you are the moderator, and the only one racing.');
      }
      // the battle has no cooldown trigger, so on stream it just stays quiet
      const left = cooldownLeft('battle', RULES.battleGlobalCooldown, RULES.battleUserCooldown);
      if (left.global > 0 || left.user > 0) {
        api.note(`!RhymeBattle is cooling down for ${Math.ceil(Math.max(left.global, left.user))} more seconds. On stream it stays quiet until then.`);
        return;
      }
      fired.battle = Date.now();

      if (battle) {
        send(MSG.battleAlreadyActive);
        return;
      }
      // A stake is taken when one is typed, or when there is a default bet, which there is.
      let bet = 0;
      if (trim(input) || RULES.defaultBet > 0) {
        bet = determineBet(user, input, true);
        if (bet < 0) return;
      }
      startBattle(user, bet);
    }

    function startBattle(user, bet) {
      const word = pickWord(user);
      if (!word) return;
      const seconds = Math.max(1, RULES.timeLimit);
      const b = Object.assign(word, {
        starter: user, bet, reward: bet > 0 ? bet : Math.max(0, RULES.battleReward), roundId: `b${++battles}`,
        endsAt: Date.now() + seconds * 1000, overlay: null,
      });
      b.answers = answersFor(b, false);
      battle = b;
      if (bet > 0) balance = Math.max(0, balance - bet);
      b.timer = later(() => {
        if (claimBattle(b)) battleTimedOut(b);
      }, seconds * 1000);

      publishStart(b, 'battle', user, seconds);
      send(fill(MSG.battleStart, {
        word: b.target, reward: formatNumber(b.reward), currency: RULES.pointsName, timeLimit: RULES.timeLimit, user,
      }));
    }

    function claimBattle(b) {
      if (battle !== b) return false;
      battle = null;
      cancel(b.timer);
      return true;
    }

    // Any chatter's line: the first valid rhyme takes it, and everything else is ignored.
    function battleGuess(user, rawInput) {
      const b = battle;
      if (!b || !trim(rawInput)) return;
      const guess = readGuess(rawInput, b.sentence);
      if (!guess || !isValidRhyme(guess, b)) return;
      if (claimBattle(b)) battleWon(b, user, guess);
    }

    function battleWon(b, user, guess) {
      let current = balance;
      if (b.reward > 0) {
        current += b.reward;
        balance = current;
      }
      publishEnd(b, 'win', guess, b.reward, current, user, 4);
      send(fill(MSG.battleWin, {
        winner: `@${user}`, word: b.target, guess, reward: formatNumber(b.reward), currency: RULES.pointsName,
        currentPoints: formatNumber(current),
      }));
    }

    // Nobody won, so the moderator's stake goes back.
    function battleTimedOut(b) {
      if (b.bet > 0) balance += b.bet;
      publishEnd(b, 'timeout', null, 0, 0, null, 4);
      send(fill(MSG.battleTimeout, { word: b.target, examples: b.examples.slice(0, 4).join(', '), currency: RULES.pointsName }));
    }

    /* ---------- chat ---------- */

    // Both actions read every chat line for answers, the commands among them, before a command
    // gets to run.
    function handle(user, text) {
      const message = String(text);
      const [word = '', input = ''] = trim(message).split(/\s+/);
      const command = word.toLowerCase();
      rhymeGuess(user, message);
      battleGuess(user, message);
      if (command === '!rhyme') rhymeCommand(user, input);
      else if (command === '!rhymebattle') battleCommand(user, input);
    }

    return {
      handle, reset, overlay,
      get balance() { return balance; },
      // what the quick buttons offer while a word is up
      get answers() {
        return [...new Set([...(round ? round.answers : []), ...(battle ? battle.answers : [])])];
      },
    };
  }

  // The card is up while a round runs, and while its result shows.
  function isActive(state) {
    if (!state || state.game !== 'rhymetime') return false;
    if (state.type !== 'round_end') return true;
    return Date.now() < state.sentAt + state.resultSeconds * 1000 + RESULT_LAG_MS;
  }

  window.PlaygroundGames = window.PlaygroundGames || {};
  window.PlaygroundGames.RhymeTime = {
    title: 'The RhymeTime overlay',
    idle: ['No word up yet', 'Type !rhyme in the chat for your first word.'],
    welcome: 'You are "viewer" with 10.000 pretend Points. Get a word with !rhyme <bet> and answer in chat within 30 seconds, or open a battle with !rhymebattle.',
    note: 'The solo round and the battle with the game\'s default settings, cooldowns included, and its own chat lines. A rhyme nobody listed is checked against a dictionary online on stream; here a letters-only test stands in.',
    scene: 'night',
    // the card in the middle: on stream it sits at the left edge by default
    query: '?position=center',
    isActive,
    quick: engine => {
      const answers = engine.answers;
      return answers.length ? answers : ['!rhyme', '!rhyme 500', '!rhyme half', '!rhymebattle'];
    },
    create,
  };
})();
