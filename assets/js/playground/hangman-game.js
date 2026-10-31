/*
 * Hangman Game's rules for the playground (see assets/js/playground.js): a round as Hangman-Game.cs
 * plays it with its default settings, its chat lines word for word, and the hangman_state.json it
 * writes for the overlay. The words are the game's 15 built-in ones, the list a fresh install plays
 * until a wordlist is imported. By default only moderators and the broadcaster start a round, so
 * "viewer" is a moderator here. Points are pretend: what the viewer wins only counts in !hmp and
 * !hms, and "Start over" clears it with the rest. Blitz rounds, Evil Hangman, streaks and Channel
 * Points are off by default and stay in the real game.
 */
(() => {
  'use strict';

  const RULES = {
    platform: 'twitch',
    pointsName: 'Points',
    separator: ',',
    requireModToStart: true,
    maxWrongGuesses: 6,
    roundDurationSeconds: 300,
    minDifficulty: 1,
    maxDifficulty: 6,
    rewardWinPoints: 500,
    // EnableRewardPerLetter is on
    rewardLetterPts: 50,
    difficultyBonusPercent: 25,
    lengthBonusPercent: 5,
    lengthBonusFromLetters: 4,
    maxWordBonusPercent: 200,
    antiCheatWindowSeconds: 10,
    antiCheatMaxGuesses: 3,
    hintAfterWrongGuesses: 3,
    hintStopRevealPercent: 75,
    addictedPointsPenaltyPercent: 50,
    addictedGuessIntervalSeconds: 5,
    timeReminderSecondsLeft: 30,
    scoreboardTopN: 5,
    // FormatMultiplier(BlitzPayoutMultiplier): in every state and message, blitz or not
    multiplier: '2',
  };

  // the chatter: a moderator, so a round can start with RequireModToStart on
  const ROLE = { isModerator: true, isBroadcaster: false };

  // Hangman-Game.cs's default chat lines, and the scoreboard's
  const MSG = {
    timeReminder: '⏳ {seconds}s left! Word: {masked} | ❤️ Lives: {lives}/{maxlives}',
    gameStart: '🎮 Hangman started! Category: {category} | Word: {masked} | ❤️ Lives: {lives}/{maxlives} | Guess with !g <letter or word>',
    alreadyRunning: '⚠️ A Hangman round is already running! Word: {masked} | ❤️ Lives: {lives}/{maxlives}',
    noGameActive: '⚠️ No Hangman round is active right now.',
    gameStopped: '🛑 Hangman stopped by a mod. The word was: {word}',
    gameOver: '💀 Game over! Nobody guessed it. The word was: {word}',
    gameTimeout: "⏰ Time's up! The word was: {word}",
    correctLetter: "✅ @{user} found '{letter}'! Word: {masked} | ❤️ Lives: {lives}/{maxlives} | Guessed: {guessed}",
    wrongLetter: "❌ @{user} — '{letter}' is not in the word! ❤️ Lives: {lives}/{maxlives} | Wrong: {wrong}",
    alreadyGuessed: "🔁 @{user}, '{letter}' was already guessed!",
    correctWord: "🎉 @{user} solved it! The word was '{word}'! +{points} {pointsName}",
    wrongWord: "❌ @{user} — '{guess}' is wrong! (-2 lives) ❤️ Lives: {lives}/{maxlives}",
    wrongPartial: "❌ @{user} — '{guess}' is not the word! (-1 life) ❤️ Lives: {lives}/{maxlives}",
    letterReward: "💰 @{user} earned {points} {pointsName} for revealing '{letter}'!",
    invalidGuess: '❓ @{user}, use !g <letter> or !g <word> to guess.',
    antiCheat: '⏳ @{user}, slow down! Max {maxguesses} guesses per {window}s.',
    duplicateWrong: "🔁 @{user}, you already tried '{guess}' — don't spam!",
    modOnly: '🚫 @{user}, only moderators and the broadcaster can start Hangman.',
    hint: '💡 Hint: {hint}',
    repeat: '🔁 Word: {masked} | ❤️ Lives: {lives}/{maxlives} | Guessed: {guessed} | Wrong: {wrong}',
    addictedSlowdown: "⏳ @{user}, slow down! You're addicted — wait {seconds}s between guesses.",
    addictedUsage: 'Usage: !addicted add <user> | !addicted remove <user>',
    addictedAdded: '{targetUser} was added to the addicted list.',
    addictedRemoved: '{targetUser} was removed from the addicted list.',
    addictedAlreadyOnList: '{targetUser} is already on the addicted list.',
    addictedNotOnList: '{targetUser} is not on the addicted list.',
    scoreboardHeader: '🏆 Hangman Top {topn} — {platform}:',
    scoreboardEntry: '{medal}{rank}. {user} — {wins} wins | WR: {winrate}% | {points} pts',
    scoreboardEmpty: '📊 No scoreboard data yet for {platform}.',
    personalStats: '📊 @{user} — 🏆 Wins: {wins} | 🎮 Played: {played} | 📈 WR: {winrate}% | 💰 Points: {points} | 🔤 Letters: {letters} | 💡 Word Wins: {wordwins}',
    noStats: '📊 @{user} has no Hangman stats yet.',
    userNotFound: "❓ Could not find user '{target}'.",
  };

  // the built-in wordlist (_defaultWords), which the game writes when Hangman-Wordlist.json is missing
  const WORDS = [
    { word: 'streamer', hint: 'Someone who broadcasts live', category: 'Streaming', difficulty: 1 },
    { word: 'emote', hint: 'Tiny chat reaction image', category: 'Twitch', difficulty: 1 },
    { word: 'raid', hint: 'Sending your viewers to another channel', category: 'Twitch', difficulty: 1 },
    { word: 'clip', hint: 'Short recorded moment from a stream', category: 'Twitch', difficulty: 1 },
    { word: 'vod', hint: 'Recorded version of a past stream', category: 'Twitch', difficulty: 1 },
    { word: 'overlay', hint: 'Graphics shown on top of a stream', category: 'Streaming', difficulty: 2 },
    { word: 'moderator', hint: 'Keeps chat clean', category: 'Twitch', difficulty: 2 },
    { word: 'broadcast', hint: 'Sending out a live stream signal', category: 'Streaming', difficulty: 2 },
    { word: 'subscriber', hint: 'Paying supporter of a channel', category: 'Streaming', difficulty: 2 },
    { word: 'hypetrain', hint: 'Twitch engagement event in chat', category: 'Twitch', difficulty: 2 },
    { word: 'streamer bot', hint: 'Best software in the world', category: 'Streaming', difficulty: 2 },
    { word: 'latency', hint: 'Delay between action and reaction', category: 'Tech', difficulty: 2 },
    { word: 'algorithm', hint: 'Platform decides who sees you with this', category: 'Tech', difficulty: 3 },
    { word: 'bandwidth', hint: 'How much data you can push per second', category: 'Tech', difficulty: 3 },
    { word: 'prediction', hint: 'Chat bets on an outcome with points', category: 'Twitch', difficulty: 3 },
  ];

  // what the overlay reads from the settings (BuildOverlayOptions), at their defaults
  const OVERLAY = {
    scale: 1, fontScale: 1, showCategory: true, showHint: true, showGuessed: true, showWrong: true,
    showWrongWords: true, showLives: true, figureColor: '#f2f2f2', gallowsColor: '#f2f2f2', textColor: '#ffffff',
    accentColor: '#e91e63', bgColor: '#000000', bgOpacity: 0, endFadeSec: 8, glitchSec: 3,
  };
  // OverlayAssetVersion: the overlay reloads itself when a state carries a newer one than its own
  const OVERLAY_VERSION = 9;

  // Before the first round the game has written no state file and the overlay shows nothing. This
  // stand-in keeps it that way: a state that is not active with no fade time is hidden at once.
  const noState = () => ({ active: false, overlay: { endFadeSec: 0 } });

  // FormatMsg: every {key} in turn, in the order the values were added
  const fill = (text, values) => Object.keys(values).reduce((out, key) => out.split(`{${key}}`).join(values[key]), text);

  // 1234567 → "1,234,567", as FormatNumber: "N0" with the "," separator
  function formatNumber(value) {
    const digits = String(Math.abs(Math.trunc(value)));
    let out = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) out += RULES.separator;
      out += digits[i];
    }
    return (value < 0 ? '-' : '') + out;
  }

  // Math.Round: halves go to the even neighbour
  function roundEven(value) {
    const floor = Math.floor(value);
    const rest = value - floor;
    if (rest !== 0.5) return rest > 0.5 ? floor + 1 : floor;
    return floor % 2 === 0 ? floor : floor + 1;
  }

  // ToLowerInvariant and char.IsLetter, one UTF-16 unit at a time like a C# char
  const lower = text => String(text).split('').map(c => {
    const l = c.toLowerCase();
    return l.length === 1 ? l : c;
  }).join('');
  const isLetter = c => /^\p{L}$/u.test(c);

  const countLetters = word => word.split('').filter(c => c !== ' ').length;

  // DateTime.UtcNow.ToString("O"): seven digits after the second
  const isoTime = ms => new Date(ms).toISOString().replace('Z', '0000Z');
  // Guid.NewGuid().ToString("N")
  const newRoundId = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  /* ---------- the game ---------- */

  function create(api) {
    const timers = new Set();
    let state;
    let usedWords;
    let stats;
    let names;
    let addictedUsers;
    let published;
    let chatter;

    // ResetState: a round's state, empty; the round number carries on
    function freshState(roundNumber) {
      return {
        active: false, word: '', category: '', hint: '', hintSent: false, difficulty: 0, roundNumber,
        maxWrong: 0, duration: 0, guessed: new Set(), wrongLetters: [], wrongWords: [], wrongGuesses: 0,
        roundStart: 0, roundId: '', participants: new Set(), displayNames: new Map(), antiCheatHits: new Map(),
        wrongWordGuesses: new Map(), addictedThrottle: new Map(), countdown: [],
      };
    }

    function reset() {
      timers.forEach(id => clearTimeout(id));
      timers.clear();
      state = freshState(0);
      // hangman_UsedWords_twitch
      usedWords = [];
      // the hm_* user variables, by user id
      stats = new Map();
      names = new Map();
      // AddictedUsers, which !hma writes to configs.json
      addictedUsers = '';
      published = noState();
      chatter = { name: '', id: '', ...ROLE };
    }
    reset();

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

    // SendPlatformMessage: nothing for an empty line
    function send(text) {
      if (text && text.trim()) api.say(text);
    }

    function addStat(id, key, delta) {
      if (delta === 0) return;
      if (!stats.has(id)) stats.set(id, {});
      const userStats = stats.get(id);
      userStats[key] = (userStats[key] || 0) + delta;
    }

    /* ---------- the word and its state ---------- */

    const livesLeft = () => Math.max(0, state.maxWrong - state.wrongGuesses);
    const maskWord = () => state.word.split('').map(c => c === ' ' ? '–' : state.guessed.has(c) ? c : '_').join(' ');
    const guessedText = () => state.guessed.size ? [...state.guessed].sort().join(', ') : '-';
    const wrongText = () => state.wrongLetters.length ? state.wrongLetters.join(', ') : '-';
    const wrongWordsText = () => state.wrongWords.length ? state.wrongWords.join(', ') : '-';
    const isSolved = () => state.word.split('').every(c => c === ' ' || state.guessed.has(c));

    // FormatMsg: the chatter, the points and the round as it stands, then the line's own values
    function format(template, round, extra) {
      if (!template || !template.trim()) return '';
      const values = { user: chatter.name, pointsName: RULES.pointsName, multiplier: RULES.multiplier };
      if (round) {
        Object.assign(values, {
          masked: maskWord(), lives: String(livesLeft()), maxlives: String(state.maxWrong), category: state.category,
          hint: state.hint, difficulty: String(state.difficulty), length: String(countLetters(state.word)),
          guessed: guessedText(), wrong: wrongText(), wrongwords: wrongWordsText(), word: state.word,
        });
      }
      return fill(template, Object.assign(values, extra || {}));
    }
    // FormatMsgLocked: with the round only while it runs
    const formatLocked = (template, extra) => format(template, state.active, extra);

    // proportional figure for up to 6 lives, the extended one (gallows built too) above that
    function figureStage(wrong, maxWrong, stageCount) {
      if (stageCount <= 0 || wrong <= 0) return 0;
      if (maxWrong <= 0 || wrong >= maxWrong) return stageCount;
      return Math.max(0, Math.min(stageCount, Math.round(wrong * stageCount / maxWrong)));
    }

    // BuildStateData, then what WriteOverlayState adds: hangman_state.json
    function stateData(endReason, endTime) {
      const word = state.word;
      const data = {
        platform: RULES.platform,
        active: state.active,
        word,
        masked: state.active ? maskWord() : word.split('').map(c => c === ' ' ? '–' : c).join(' '),
        category: state.category,
        hint: state.hintSent ? state.hint : '',
        difficulty: state.difficulty,
        length: countLetters(word),
        lives: livesLeft(),
        maxlives: state.maxWrong,
        wrongCount: state.wrongGuesses,
        roundNumber: state.roundNumber,
        roundId: state.roundId,
        blitz: false,
        multiplier: RULES.multiplier,
        glitch: '',
        guessed: guessedText(),
        wrong: wrongText(),
        wrongWords: wrongWordsText(),
        startTime: state.roundStart ? isoTime(state.roundStart) : '',
      };
      if (endReason) data.endReason = endReason;
      if (endTime) data.endTime = isoTime(endTime);
      const maxWrong = state.maxWrong > 0 ? state.maxWrong : RULES.maxWrongGuesses;
      const mode = maxWrong > 6 ? 'extended' : 'proportional';
      const stageCount = mode === 'extended' ? 10 : 6;
      data.overlay = { mode, stage: figureStage(state.wrongGuesses, maxWrong, stageCount), stageCount, ...OVERLAY };
      data.overlayVersion = OVERLAY_VERSION;
      return data;
    }

    // PublishState. The game writes it right before or after the chat line that goes with it; here
    // the overlay changes with that line.
    function publish(data) {
      published = data;
    }

    function overlay() {
      return published;
    }

    // PickWord: a word not played yet, and all of them again once every one has been
    function pickWord() {
      const filtered = WORDS.filter(w => w.difficulty >= RULES.minDifficulty && w.difficulty <= RULES.maxDifficulty);
      let available = filtered.filter(w => !usedWords.includes(w.word));
      if (!available.length) {
        usedWords = usedWords.filter(used => !filtered.some(w => w.word === used));
        available = filtered;
      }
      const picked = available[Math.floor(Math.random() * available.length)];
      usedWords.push(picked.word);
      return picked;
    }

    /* ---------- the end of a round ---------- */

    // EndRoundLocked: the round's last state, then a fresh one
    function endRound(reason) {
      const end = {
        word: state.word, difficulty: state.difficulty, letters: countLetters(state.word), participants: [...state.participants],
      };
      state.countdown.forEach(cancel);
      state.active = false;
      end.payload = stateData(reason, Date.now());
      state = freshState(state.roundNumber);
      return end;
    }

    // CompleteRoundEnd: the last state goes to the overlay, which shows it for endFadeSec and fades
    // out. Not the game's: once it has, the overlay is drawn again so the playground can bring its
    // idle text back (see isActive at the bottom).
    function completeRoundEnd(end) {
      publish(end.payload);
      later(() => api.draw(), OVERLAY.endFadeSec * 1000 + 1000);
    }

    // CheckTimeout, before every command of the game: a round past its time ends here
    function checkTimeout() {
      if (!state.active || state.duration <= 0) return;
      if ((Date.now() - state.roundStart) / 1000 < state.duration) return;
      const message = format(MSG.gameTimeout, true);
      completeRoundEnd(endRound('timeout'));
      send(message);
    }

    // RunCountdownAsync: a reminder with 30 seconds left, then time's up
    function startCountdown() {
      const roundId = state.roundId;
      const seconds = state.duration;
      if (seconds <= 0) return;
      const sameRound = () => state.active && state.roundId === roundId;
      if (RULES.timeReminderSecondsLeft > 0 && seconds > RULES.timeReminderSecondsLeft) {
        state.countdown.push(later(() => {
          if (sameRound()) send(format(MSG.timeReminder, true, { user: '', seconds: String(RULES.timeReminderSecondsLeft) }));
        }, (seconds - RULES.timeReminderSecondsLeft) * 1000));
      }
      state.countdown.push(later(() => {
        if (!sameRound()) return;
        const message = format(MSG.gameTimeout, true, { user: '' });
        completeRoundEnd(endRound('timeout'));
        send(message);
      }, seconds * 1000));
    }

    function wordBonusPercent(difficulty, letters) {
      const byDifficulty = RULES.difficultyBonusPercent * Math.max(0, difficulty - 1);
      const byLength = RULES.lengthBonusPercent * Math.max(0, letters - Math.max(0, RULES.lengthBonusFromLetters));
      let total = Math.max(0, byDifficulty + byLength);
      if (RULES.maxWordBonusPercent > 0 && total > RULES.maxWordBonusPercent) total = RULES.maxWordBonusPercent;
      return total;
    }

    // AwardPoints: the addicted earn half; a letter says so in chat, the win in its own line
    function awardPoints(amount, context, isLetter) {
      if (amount <= 0) return 0;
      const multiplier = Math.max(0, 1 - (isAddicted() ? RULES.addictedPointsPenaltyPercent / 100 : 0));
      const adjusted = roundEven(amount * multiplier);
      if (adjusted <= 0) return 0;
      addStat(chatter.id, 'hm_pointsEarned', adjusted);
      if (isLetter) {
        send(formatLocked(MSG.letterReward, {
          user: chatter.name, points: formatNumber(adjusted), pointsName: RULES.pointsName, letter: context,
        }));
      }
      return adjusted;
    }

    function completeWin(end) {
      completeRoundEnd(end);
      addStat(chatter.id, 'hm_wins', 1);
      const bonus = wordBonusPercent(end.difficulty, end.letters);
      const basePoints = RULES.rewardWinPoints > 0 ? roundEven(RULES.rewardWinPoints * (1 + bonus / 100)) : 0;
      const awarded = awardPoints(basePoints, end.word, false);
      send(format(MSG.correctWord, false, {
        user: chatter.name, word: end.word, points: formatNumber(awarded), basepoints: formatNumber(basePoints),
        bet: '0', stake: '0', difficulty: String(end.difficulty), length: String(end.letters),
        wordbonus: bonus.toFixed(0), streak: '0', streakbonus: '0', pointsName: RULES.pointsName,
      }));
    }

    // everyone who guessed in the round takes the loss
    function completeLoss(end) {
      completeRoundEnd(end);
      end.participants.forEach(id => addStat(id, 'hm_losses', 1));
      send(format(MSG.gameOver, false, { user: chatter.name, word: end.word }));
    }

    /* ---------- !hangman and !killhangman ---------- */

    function start(inputs) {
      // IsOnCooldown: both cooldowns are 0 by default
      if (RULES.requireModToStart && !chatter.isModerator && !chatter.isBroadcaster) {
        send(format(MSG.modOnly, false));
        return;
      }
      if (state.active) {
        send(format(MSG.alreadyRunning, true));
        return;
      }
      const entry = pickWord();
      state = freshState(state.roundNumber + 1);
      Object.assign(state, {
        roundId: newRoundId(), active: true, word: lower(entry.word), category: entry.category, hint: entry.hint,
        difficulty: entry.difficulty, roundStart: Date.now(), maxWrong: RULES.maxWrongGuesses,
        duration: Math.max(0, RULES.roundDurationSeconds),
      });
      publish(stateData());
      if (lower((inputs[0] || '').trim()) === 'blitz') {
        api.note('Blitz rounds are switched off in the default settings, so this is a normal round.');
      }
      send(format(MSG.gameStart, true, { bet: formatNumber(0), seconds: String(state.duration) }));
      startCountdown();
    }

    function stop() {
      if (!chatter.isModerator && !chatter.isBroadcaster) {
        send(format(MSG.modOnly, false));
        return;
      }
      if (!state.active) {
        send(format(MSG.noGameActive, false));
        return;
      }
      const message = format(MSG.gameStopped, true);
      completeRoundEnd(endRound('stopped'));
      send(message);
    }

    /* ---------- !g ---------- */

    // AntiCheatCheck: at most 3 guesses in 10 seconds, whatever they are
    function antiCheat() {
      if (RULES.antiCheatMaxGuesses <= 0 || chatter.isBroadcaster) {
        state.participants.add(chatter.id);
        return true;
      }
      const now = Date.now();
      const hits = (state.antiCheatHits.get(chatter.id) || []).filter(at => (now - at) / 1000 < RULES.antiCheatWindowSeconds);
      state.antiCheatHits.set(chatter.id, hits);
      if (hits.length >= RULES.antiCheatMaxGuesses) {
        send(format(MSG.antiCheat, true, {
          maxguesses: String(RULES.antiCheatMaxGuesses), window: String(RULES.antiCheatWindowSeconds),
        }));
        return false;
      }
      hits.push(now);
      state.participants.add(chatter.id);
      return true;
    }

    // IsUserAddicted: on the list by name or id (AddictedGroups is empty by default)
    function isAddicted() {
      if (chatter.isBroadcaster) return false;
      const list = addictedUsers.split(',').map(x => lower(x.trim())).filter(x => x.length > 0);
      return list.includes(lower(chatter.name)) || list.includes(lower(chatter.id));
    }

    // CheckAddictedThrottle: the addicted wait 5 seconds between their guesses
    function addictedThrottle() {
      if (!isAddicted()) return true;
      const now = Date.now();
      const key = lower(chatter.name);
      let wait = 0;
      if (state.addictedThrottle.has(key)) {
        const remaining = RULES.addictedGuessIntervalSeconds - (now - state.addictedThrottle.get(key)) / 1000;
        if (remaining > 0) wait = Math.ceil(remaining);
      }
      if (wait === 0) {
        state.addictedThrottle.set(key, now);
        return true;
      }
      send(format(MSG.addictedSlowdown, true, { seconds: String(wait) }));
      return false;
    }

    // ShouldSendHintLocked (HintEnabled is on): once, from the 3rd wrong guess, while less than 75%
    // of the word shows
    function hintMessage() {
      if (state.hintSent || !state.hint.trim()) return null;
      if (state.wrongGuesses < RULES.hintAfterWrongGuesses) return null;
      const revealable = countLetters(state.word);
      const revealed = state.word.split('').filter(c => c !== ' ' && state.guessed.has(c)).length;
      const percent = revealable > 0 ? revealed * 100 / revealable : 100;
      if (percent >= RULES.hintStopRevealPercent) return null;
      state.hintSent = true;
      return format(MSG.hint, true);
    }

    function guess(inputs) {
      if (!state.active) {
        send(format(MSG.noGameActive, false));
        return;
      }
      const wasParticipant = state.participants.has(chatter.id);
      // IsUserBlocked: nobody is blocked by default
      if (!antiCheat()) return;
      if (!addictedThrottle()) return;
      if (!wasParticipant) addStat(chatter.id, 'hm_gamesPlayed', 1);
      state.displayNames.set(chatter.id, chatter.name);

      const raw = lower(inputs.filter(part => part.trim()).map(part => part.trim()).join(' ')).trim();
      if (!raw) send(formatLocked(MSG.invalidGuess));
      else if (raw.length === 1 && isLetter(raw)) letterGuess(raw);
      else if (raw.length > 1 && raw.split('').every(c => isLetter(c) || c === ' ')) wordGuess(raw);
      else send(formatLocked(MSG.invalidGuess));
    }

    function letterGuess(letter) {
      let message;
      let hit = false;
      let solved = false;
      let lost = false;
      let hint = null;
      let end = null;

      if (state.guessed.has(letter)) {
        message = format(MSG.alreadyGuessed, true, { letter });
      } else if (state.word.includes(letter)) {
        hit = true;
        state.guessed.add(letter);
        message = format(MSG.correctLetter, true, { letter });
        solved = isSolved();
        if (solved) end = endRound('win');
        else publish(stateData());
      } else {
        state.guessed.add(letter);
        state.wrongLetters.push(letter);
        state.wrongGuesses++;
        message = format(MSG.wrongLetter, true, { letter });
        hint = hintMessage();
        lost = state.wrongGuesses >= state.maxWrong;
        if (lost) end = endRound('gameover');
        else publish(stateData());
      }

      send(message);
      if (hit) {
        addStat(chatter.id, 'hm_lettersFound', 1);
        if (RULES.rewardLetterPts > 0) awardPoints(RULES.rewardLetterPts, letter, true);
      }
      if (solved) completeWin(end);
      if (hint) send(hint);
      if (lost) completeLoss(end);
    }

    // A wrong word as long as the answer costs two lives, any other one life.
    function wordGuess(guessed) {
      let message = null;
      let won = false;
      let lost = false;
      let hint = null;
      let end = null;

      if (!state.wrongWordGuesses.has(chatter.id)) state.wrongWordGuesses.set(chatter.id, new Set());
      const tried = state.wrongWordGuesses.get(chatter.id);
      if (tried.has(guessed)) {
        message = format(MSG.duplicateWrong, true, { guess: guessed });
      } else if (guessed === state.word) {
        won = true;
        end = endRound('win');
      } else {
        tried.add(guessed);
        if (!state.wrongWords.includes(guessed)) state.wrongWords.push(guessed);
        state.participants.add(chatter.id);
        const fullLength = guessed.length === state.word.length;
        state.wrongGuesses += fullLength ? 2 : 1;
        message = format(fullLength ? MSG.wrongWord : MSG.wrongPartial, true, { guess: guessed });
        hint = hintMessage();
        lost = state.wrongGuesses >= state.maxWrong;
        if (lost) end = endRound('gameover');
        else publish(stateData());
      }

      if (message) send(message);
      if (won) {
        addStat(chatter.id, 'hm_wordsGuessed', 1);
        completeWin(end);
      }
      if (hint) send(hint);
      if (lost) completeLoss(end);
    }

    /* ---------- !hmr and !hma ---------- */

    function repeat() {
      send(state.active ? format(MSG.repeat, true) : format(MSG.noGameActive, false));
    }

    const addictedMessage = (template, target) => template.trim()
      ? template.split('{user}').join(chatter.name).split('{targetUser}').join(target)
      : '';

    // ManageAddictedUser: "!hma add <user>", "!hma remove <user>", or "!hma <user>" to add
    function addicted(inputs) {
      if (!chatter.isModerator && !chatter.isBroadcaster) {
        send(format(MSG.modOnly, false));
        return;
      }
      const input0 = lower((inputs[0] || '').trim());
      const input1 = lower((inputs[1] || '').trim());
      const named = input0 === 'add' || input0 === 'remove';
      const action = named ? input0 : 'add';
      let target = named ? input1 : input0;
      if (!target.trim()) {
        send(addictedMessage(MSG.addictedUsage, ''));
        return;
      }
      target = target.replace(/^@+/, '');
      const list = [...new Set(addictedUsers.split(',').map(x => lower(x.trim())).filter(x => x.length > 0))];
      if (action === 'add') {
        if (list.includes(target)) {
          send(addictedMessage(MSG.addictedAlreadyOnList, target));
          return;
        }
        addictedUsers = [...list, target].join(',');
        send(addictedMessage(MSG.addictedAdded, target));
        return;
      }
      if (!list.includes(target)) {
        send(addictedMessage(MSG.addictedNotOnList, target));
        return;
      }
      addictedUsers = list.filter(x => x !== target).join(',');
      send(addictedMessage(MSG.addictedRemoved, target));
    }

    /* ---------- the scoreboard: !hmp, !hml and !hms ---------- */

    const getStat = (id, key) => (stats.get(id) || {})[key] || 0;
    // the users Streamer.bot has an hm_wins variable for: everyone who has won a round
    const withWins = () => [...stats.keys()].filter(id => 'hm_wins' in stats.get(id));
    const winRate = (wins, played) => (played > 0 ? roundEven(wins * 100 / played * 10) / 10 : 0).toFixed(1);

    function personal(id, name) {
      const [wins, losses, played, points, letters, wordWins] = ['hm_wins', 'hm_losses', 'hm_gamesPlayed', 'hm_pointsEarned', 'hm_lettersFound', 'hm_wordsGuessed'].map(key => getStat(id, key));
      if (wins === 0 && losses === 0 && played === 0 && points === 0) {
        send(fill(MSG.noStats, { user: name }));
        return;
      }
      // the streak line follows only with streaks switched on
      send(fill(MSG.personalStats, {
        user: name, wins: formatNumber(wins), losses: formatNumber(losses), played: formatNumber(played),
        points: formatNumber(points), letters: formatNumber(letters), wordwins: formatNumber(wordWins),
        streak: '0', beststreak: '0', winrate: winRate(wins, played),
      }));
    }

    function lookup(inputs) {
      const input = (inputs[0] || '').trim().replace(/^@+/, '');
      if (!input.trim() || lower(input) === lower(chatter.name)) {
        personal(chatter.id, chatter.name);
        return;
      }
      const match = withWins().find(id => lower(names.get(id) || '') === lower(input));
      if (!match) {
        send(fill(MSG.userNotFound, { target: input }));
        return;
      }
      personal(match, names.get(match));
    }

    // The broadcaster and the bot stay off the board by default; "viewer" is neither.
    function board() {
      const platform = RULES.platform[0].toUpperCase() + RULES.platform.slice(1);
      const rows = withWins().map(id => ({
        name: names.get(id), wins: getStat(id, 'hm_wins'), played: getStat(id, 'hm_gamesPlayed'), points: getStat(id, 'hm_pointsEarned'),
      })).filter(row => row.name && (row.wins !== 0 || row.played !== 0 || row.points !== 0));
      if (!rows.length) {
        send(fill(MSG.scoreboardEmpty, { platform }));
        return;
      }
      rows.sort((a, b) => b.wins - a.wins || b.points - a.points);
      const topN = Math.min(25, Math.max(1, RULES.scoreboardTopN));
      send(fill(MSG.scoreboardHeader, { topn: String(topN), platform }));
      rows.slice(0, topN).forEach((row, i) => {
        send(fill(MSG.scoreboardEntry, {
          medal: ['🥇 ', '🥈 ', '🥉 '][i] || '', rank: String(i + 1), user: row.name, wins: formatNumber(row.wins),
          points: formatNumber(row.points), winrate: winRate(row.wins, row.played),
        }));
      });
    }

    /* ---------- chat ---------- */

    // the commands of the Hangman Game action, and of the Scoreboard action
    const GAME = {
      '!hangman': start, '!hm': start, '!killhangman': stop, '!killhm': stop, '!guess': guess, '!g': guess,
      '!hangmanrepeat': repeat, '!hmr': repeat, '!hangmanaddict': addicted, '!hma': addicted,
    };
    const SCOREBOARD = {
      '!hangmanpersonal': () => personal(chatter.id, chatter.name), '!hmp': () => personal(chatter.id, chatter.name),
      '!hmlookup': lookup, '!hml': lookup, '!hangmanscoreboard': board, '!hms': board,
    };

    function handle(user, text) {
      const [word, ...rest] = String(text).trim().split(/\s+/);
      const command = lower(word);
      const inputs = rest.filter(Boolean);
      // the user id is the name here; Streamer.bot keeps the name with the user's variables
      chatter = { name: user, id: lower(user), ...ROLE };
      if (Object.prototype.hasOwnProperty.call(GAME, command)) {
        names.set(chatter.id, chatter.name);
        checkTimeout();
        GAME[command](inputs);
      } else if (Object.prototype.hasOwnProperty.call(SCOREBOARD, command)) {
        names.set(chatter.id, chatter.name);
        SCOREBOARD[command](inputs);
      }
    }

    return {
      handle, reset, overlay,
      get playing() { return state.active; },
      get guessed() { return [...state.guessed]; },
    };
  }

  // the letters the quick buttons offer, most common first
  const COMMON = 'eaoirtnslcudpmhgbyfwkvxzjq';

  window.PlaygroundGames = window.PlaygroundGames || {};
  window.PlaygroundGames['Hangman-Game'] = {
    title: 'The Hangman overlay',
    scene: 'night',
    idle: ['The gallows are empty', 'Type !hangman in the chat to start a round.'],
    welcome: 'You are "viewer", and a moderator here: by default only mods and the broadcaster start Hangman. Start a round with !hangman, then guess with !g <letter> or !g <word>.',
    note: 'Hangman with the game\'s default settings, its own chat lines and its 15 built-in words. A round lasts five minutes, as on stream.',
    // A round on the overlay, and its end banner until the overlay fades it out endFadeSec later.
    isActive: state => !!state.active || (typeof state.endTime === 'string'
      && Date.now() - Date.parse(`${state.endTime.slice(0, 23)}Z`) < ((state.overlay && state.overlay.endFadeSec) || 0) * 1000),
    quick: engine => engine.playing
      ? [...COMMON].filter(letter => !engine.guessed.includes(letter)).slice(0, 3).map(letter => `!g ${letter}`).concat('!hmr')
      : ['!hangman', '!hmp', '!hms'],
    create,
  };
})();
