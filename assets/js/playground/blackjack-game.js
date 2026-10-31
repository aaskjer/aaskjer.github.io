/*
 * Blackjack Game's rules for the playground (see assets/js/playground.js): the solo table against
 * the dealer, as BlackjackGame.cs plays it with its default settings, its chat lines word for word,
 * and the overlay state it writes. Points are pretend: a balance of 10.000 that "Start over" fills
 * again. Duels and the house table need more than one chatter and stay in the real game.
 */
(() => {
  'use strict';

  const USER_POINTS = 10000;
  const RULES = {
    pointsName: 'Points',
    defaultBet: 1234,
    minBet: 1,
    maxBet: Number.MAX_SAFE_INTEGER,
    dealerStandsOn: 17,
    blackjackPayout: 1.5,
    allowDoubleDown: true,
    allowSplit: true,
    allowResplit: false,
    maxSplitHands: 4,
    showAceMsg: true,
    tieDrawOnlyOneCard: false,
    decks: 6,
    // a pause after each card the dealer draws, as DealerDrawDelayMs
    dealerDrawDelayMs: 500,
    separator: '.',
  };

  // BlackjackGame.cs's default chat lines
  const MSG = {
    gameStart: '🃏 {user} is dealt in. ',
    blackjackWin: ' 🃏 B L A C K J A C K 🃏 - {amount} {points} to you!',
    regularWin: 'You take {amount} {points}.',
    loss: '{amount} {points} to the house.',
    bust: 'Bust! 💔',
    split: '{user} splits. Hand 1: {cards} ({value}) - hit, double or stand.',
    doubleDown: '{user} doubles down and draws {card}. Hand: {cards} ({value})',
    drawCard: '{user} draws {card}. Hand: {cards} ({value})',
    aceReduced: 'An Ace drops to 1 to keep that under 22.',
    balance: 'Balance: {balance} {points}.',
    specialWin5Card: 'Five cards without busting - 5-card Charlie!',
    specialWin3Sevens: 'Three sevens on the table!',
    movingToHand: 'On to hand {handnum}: {cards} ({value}) - hit, double or stand.',
    bettingAll: '{user} shoves the lot in: {bet} {points}.',
    bettingHalf: '{user} puts up half the stack: {bet} {points}.',
    bettingRandom: '{user} leaves it to chance: {bet} {points}.',
    bettingQuarter: '{user} puts up a quarter: {bet} {points}.',
    bettingDouble: '{user} doubles the minimum: {bet} {points}.',
    bettingMax: '{user} goes to the limit: {bet} {points}.',
    notEnoughPoints: 'Not enough {points} - you have {available} and need {required}.',
    insufficientSplit: 'Splitting needs {amount} more {points}.',
    insufficientDouble: 'Doubling needs {amount} more {points}.',
    alreadyActiveGame: 'You have a hand on the table - hit, stand, double or split.',
    noActiveGame: '{user}, nothing on the table. Deal in with !blackjack <bet>.',
    cannotSplitValue: "{card1} and {card2} aren't worth the same, so they don't split.",
    cannotSplitCount: 'Splitting needs exactly two cards, and you hold {cards}.',
    alreadySplit: 'One split per hand.',
    cannotDoubleCount: 'Doubling needs exactly two cards, and you hold {cards}.',
    mustDoubleFirst: 'Too late to double on {cards} - it has to be your first move.',
    alreadyDoubledDown: 'This hand is already doubled.',
    betMinApplied: '{user}, that works out below the minimum, so {min} it is.',
    tutorial: 'Blackjack: !blackjack <bet> to deal in, then hit, stand, double or split.',
    repeatNothing: "There's nothing to repeat.",
    dealerBusts: 'Dealer busts on {total} with {cards}.',
    dealerWins: 'Dealer stands on {total} with {cards} and takes it.',
    dealerDraws: 'Dealer draws {card} → {cards}',
    finalSummary: 'Final - {user}: {playercards} ({playervalue}) vs dealer {dealercards} ({dealervalue})',
    dealerTieWin: 'Still level, so the dealer takes it.',
    dealerBeatsYou: 'The dealer has it.',
    dealerDrawCard: '{hands} One more card for the dealer...',
    handBust: 'Hand {handnum} busts. 💔',
    handWin: 'Hand {handnum} wins!',
    handLost: '{user}, hand {handnum} goes to the dealer.',
    handTie: 'Hand {handnum} is level.',
    insuranceNotAvailable: "{user}, insurance isn't available right now.",
    surrenderNotAvailable: "{user}, you can't surrender right now.",
  };

  // what the overlay reads from the settings, at their defaults
  const OVERLAY = {
    active: true, platform: 'twitch', separator: RULES.separator, freeGame: false, scale: 1, showPoints: true,
    dealerName: 'Dealer', showHandValues: true, showOutcomeBadges: true, showInsurance: true, hideOnFreeGame: false,
    cardRedColor: '#d3283a', cardBlackColor: '#1a1a1a', backgroundColor: '#000000', backgroundOpacity: 0,
    animationsEnabled: true, fontScale: 1, gameOverFadeMs: 8000, insuranceBet: 0, dealerHoleHidden: false, mode: 'solo',
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

  /* ---------- cards ---------- */

  // The playing cards of Unicode, as CardSymbols: 🂡 is the Ace of Spades. The Knight between Jack
  // and Queen is skipped.
  const SUIT_BASE = { S: 0x1F0A0, H: 0x1F0B0, D: 0x1F0C0, C: 0x1F0D0 };
  const RANK_OFFSET = { A: 1, J: 11, Q: 13, K: 14 };
  const symbolOf = (rank, suit) => String.fromCodePoint(SUIT_BASE[suit] + (RANK_OFFSET[rank] || Number(rank)));

  function card(rank, suit) {
    const value = rank === 'A' ? 11 : /^[JQK]$/.test(rank) ? 10 : Number(rank);
    return { rank, suit, value, text: `${symbolOf(rank, suit)}(${value})` };
  }

  function newShoe() {
    const cards = [];
    for (let d = 0; d < RULES.decks; d++) {
      for (const suit of ['S', 'H', 'D', 'C']) {
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']) cards.push(card(rank, suit));
      }
    }
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  // the total, and whether an Ace dropped to 1 to keep it under 22
  function valueOf(hand) {
    const raw = hand.reduce((sum, c) => sum + c.value, 0);
    let total = raw;
    let aces = hand.filter(c => c.rank === 'A').length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return { total, aceReduced: total < raw };
  }
  const total = hand => valueOf(hand).total;
  const handText = hand => hand.map(c => c.text).join(' ');

  function specialWin(hand) {
    if (total(hand) > 21) return '';
    if (hand.length === 5) return 'charlie';
    if (hand.filter(c => c.rank === '7').length >= 3) return 'sevens';
    return '';
  }

  /* ---------- the table ---------- */

  function create(api) {
    let balance;
    let shoe;
    let game;
    let tutorialSent;
    let lastMessage;

    function reset() {
      balance = USER_POINTS;
      shoe = newShoe();
      game = null;
      tutorialSent = false;
      lastMessage = '';
    }
    reset();

    function draw() {
      if (shoe.length < 52) shoe = newShoe();
      return shoe.pop();
    }

    // a line of the game: also the one `repeat` posts again
    function say(text, delay) {
      lastMessage = text;
      api.say(text, delay);
    }

    const balanceMsg = () => fill(MSG.balance, { balance: formatNumber(balance), points: RULES.pointsName });

    function overlay() {
      if (!game) return { active: false };
      const dto = c => ({ rank: c.rank, suit: c.suit });
      return {
        ...OVERLAY,
        user: game.user,
        pointsName: RULES.pointsName,
        gameOver: game.over,
        dealer: { cards: game.dealer.map(dto), value: total(game.dealer) },
        hands: game.hands.map((hand, i) => ({
          cards: hand.map(dto), value: total(hand), bet: game.bets[i],
          isCurrent: !game.over && i === game.current, outcome: game.outcome[i] || '',
        })),
      };
    }

    /* ---------- !blackjack ---------- */

    function determineBet(user, input) {
      if (!input) return RULES.defaultBet;
      let bet;
      let announcement;
      const minApplied = () => { api.say(fill(MSG.betMinApplied, { user, min: formatNumber(RULES.minBet) })); return RULES.minBet; };
      switch (input) {
        case 'all':
        case 'allin':
          if (balance === 0) {
            api.say(fill(MSG.notEnoughPoints, { points: RULES.pointsName, available: formatNumber(0), required: formatNumber(RULES.minBet) }));
            return -1;
          }
          bet = Math.max(balance, RULES.minBet);
          announcement = MSG.bettingAll;
          break;
        case 'half':
          if (balance < RULES.minBet * 2) return minApplied();
          bet = Math.max(Math.floor(balance / 2), RULES.minBet);
          announcement = MSG.bettingHalf;
          break;
        case 'quarter':
        case '25%':
          if (balance < RULES.minBet * 4) return minApplied();
          bet = Math.max(Math.floor(balance / 4), RULES.minBet);
          announcement = MSG.bettingQuarter;
          break;
        case 'random':
        case 'rand': {
          const low = Math.max(RULES.minBet, Math.floor(balance / 10));
          const high = Math.min(balance, RULES.maxBet);
          if (high < low) return minApplied();
          bet = low + Math.floor(Math.random() * (high - low + 1));
          announcement = MSG.bettingRandom;
          break;
        }
        case 'double':
        case '2x':
          bet = Math.min(RULES.minBet * 2, Math.min(balance, RULES.maxBet));
          announcement = MSG.bettingDouble;
          break;
        case 'max':
        case 'maximum':
          bet = Math.min(balance, RULES.maxBet);
          if (bet < RULES.minBet) return minApplied();
          announcement = MSG.bettingMax;
          break;
        default:
          return shorthandBet(input);
      }
      bet = clamp(bet);
      api.say(fill(announcement, { user, bet: formatNumber(bet), points: RULES.pointsName }));
      return bet;
    }

    // "500", "2.5k", "1m", "50%"; anything else is the default bet
    function shorthandBet(input) {
      if (input.endsWith('%')) {
        const percent = parseFloat(input.slice(0, -1));
        if (!Number.isNaN(percent)) return Math.max(Math.floor(balance * Math.max(0, Math.min(100, percent)) / 100), RULES.minBet);
      }
      let multiplier = 1;
      if (input.endsWith('k')) { input = input.slice(0, -1); multiplier = 1000; }
      else if (input.endsWith('m')) { input = input.slice(0, -1); multiplier = 1000000; }
      const value = Number(input.replace(/,/g, ''));
      return Number.isFinite(value) ? Math.floor(value * multiplier) : RULES.defaultBet;
    }

    const clamp = bet => Math.max(RULES.minBet, Math.min(RULES.maxBet, bet));

    function start(user, input) {
      if (!tutorialSent) {
        api.say(MSG.tutorial);
        tutorialSent = true;
      }
      let bet = determineBet(user, input);
      if (bet < 0) return;
      bet = clamp(bet);
      if (bet > balance) {
        api.say(`@${user}, ${fill(MSG.notEnoughPoints, { points: RULES.pointsName, available: formatNumber(balance), required: formatNumber(bet) })}`);
        return;
      }
      if (game && !game.over) {
        api.say(MSG.alreadyActiveGame);
        return;
      }
      balance -= bet;
      game = {
        user, hands: [[]], bets: [bet], paid: [false], doubled: [false], outcome: [''], aceSplit: [false],
        current: 0, dealer: [], over: false, tookAction: false, dealerPlayed: false,
      };
      lastMessage = '';
      const hand = game.hands[0];
      hand.push(draw(), draw());
      game.dealer.push(draw());
      say(`${fill(MSG.gameStart, { user })}Hand: ${handText(hand)} (${total(hand)}), dealer shows ${handText(game.dealer)}`);

      if (hand.length === 2 && total(hand) === 21) {
        game.outcome[0] = 'blackjack';
        award(hand, bet, null, true);
        game.paid[0] = true;
        end();
      }
    }

    /* ---------- moves ---------- */

    const isSplit = () => game.hands.length > 1;
    const hand = () => game.hands[game.current];

    function hit() {
      game.tookAction = true;
      const newCard = draw();
      hand().push(newCard);
      const { total: value, aceReduced } = valueOf(hand());
      say(fill(MSG.drawCard, { user: game.user, card: newCard.text, cards: handText(hand()), value }));
      if (aceReduced && RULES.showAceMsg) say(MSG.aceReduced);

      // a fifth card or a third seven settles the hand on the spot
      const special = specialWin(hand());
      if (special) {
        awardSpecial(special, hand(), game.bets[game.current], !isSplit());
        game.paid[game.current] = true;
        if (isSplit()) next();
        return;
      }
      if (value > 21) {
        game.outcome[game.current] = 'bust';
        const bust = isSplit() ? fill(MSG.handBust, { handnum: game.current + 1 }) : MSG.bust;
        say(`${bust} - ${balanceMsg()}`);
        game.paid[game.current] = true;
        if (isSplit()) next(); else end();
      }
    }

    function stand() {
      game.tookAction = true;
      const special = specialWin(hand());
      if (special) {
        awardSpecial(special, hand(), game.bets[game.current], false);
        game.paid[game.current] = true;
      }
      next();
    }

    function doubleDown() {
      if (!RULES.allowDoubleDown) return;
      if (hand().length !== 2) { say(fill(MSG.cannotDoubleCount, { cards: handText(hand()) })); return; }
      if (game.tookAction) { say(fill(MSG.mustDoubleFirst, { cards: handText(hand()) })); return; }
      if (game.doubled[game.current]) { say(MSG.alreadyDoubledDown); return; }
      const bet = game.bets[game.current];
      if (balance < bet) { say(fill(MSG.insufficientDouble, { points: RULES.pointsName, amount: formatNumber(bet - balance) })); return; }
      balance -= bet;
      game.tookAction = true;
      game.bets[game.current] = bet * 2;
      game.doubled[game.current] = true;

      const newCard = draw();
      hand().push(newCard);
      const { total: value, aceReduced } = valueOf(hand());
      say(fill(MSG.doubleDown, { user: game.user, card: newCard.text, cards: handText(hand()), value }));
      if (aceReduced && RULES.showAceMsg) say(MSG.aceReduced);

      const special = specialWin(hand());
      if (special) {
        awardSpecial(special, hand(), game.bets[game.current], !isSplit());
        game.paid[game.current] = true;
        if (isSplit()) next();
        return;
      }
      if (value > 21) {
        game.outcome[game.current] = 'bust';
        say(isSplit() ? fill(MSG.handBust, { handnum: game.current + 1 }) : MSG.bust);
        game.paid[game.current] = true;
      }
      next();
    }

    function split() {
      if (!RULES.allowSplit) return;
      const cards = hand();
      if (cards.length !== 2) { say(fill(MSG.cannotSplitCount, { cards: handText(cards) })); return; }
      if (cards[0].value !== cards[1].value) { say(fill(MSG.cannotSplitValue, { card1: cards[0].text, card2: cards[1].text })); return; }
      if (isSplit() && !RULES.allowResplit) { say(MSG.alreadySplit); return; }
      const bet = game.bets[game.current];
      if (balance < bet) { say(fill(MSG.insufficientSplit, { points: RULES.pointsName, amount: formatNumber(bet - balance) })); return; }
      balance -= bet;

      const aces = cards[0].rank === 'A';
      const i = game.current;
      game.hands.splice(i, 1, [cards[0], draw()], [cards[1], draw()]);
      game.bets.splice(i + 1, 0, bet);
      game.paid.splice(i, 1, false, false);
      game.doubled.splice(i, 1, false, false);
      game.outcome.splice(i, 1, '', '');
      game.aceSplit.splice(i, 1, aces, aces);
      say(fill(MSG.split, { user: `@${game.user}`, cards: handText(hand()), value: total(hand()) }));
      if (aces) {
        say(`@${game.user}, split Aces get one card each and stand.`);
        game.tookAction = true;
        next();
      }
    }

    function next() {
      game.current++;
      if (game.current < game.hands.length) {
        if (game.aceSplit[game.current]) {
          game.tookAction = true;
          next();
          return;
        }
        say(fill(MSG.movingToHand, { handnum: game.current + 1, cards: handText(hand()), value: total(hand()) }));
        game.tookAction = false;
      } else {
        playDealer();
      }
    }

    /* ---------- the dealer and the payout ---------- */

    function playDealer() {
      if (game.dealerPlayed) return;
      game.dealerPlayed = true;
      if (game.hands.every(h => total(h) > 21)) {
        say(fill(MSG.dealerWins, { cards: handText(game.dealer), total: total(game.dealer) }));
        end();
        return;
      }
      while (total(game.dealer) < RULES.dealerStandsOn) {
        const newCard = draw();
        game.dealer.push(newCard);
        say(fill(MSG.dealerDraws, { card: newCard.text, cards: handText(game.dealer) }), RULES.dealerDrawDelayMs);
      }
      resolveAll();
    }

    const summary = h => fill(MSG.finalSummary, {
      user: game.user, playercards: handText(h), playervalue: total(h), dealercards: handText(game.dealer), dealervalue: total(game.dealer),
    });

    function resolveAll() {
      const dealerValue = total(game.dealer);
      game.hands.forEach((h, i) => {
        if (game.paid[i]) return;
        const bet = game.bets[i];
        const value = total(h);
        const handWin = isSplit() ? fill(MSG.handWin, { handnum: i + 1 }) : null;
        // a win's summary goes out with the payout: award() opens its line with it
        if (dealerValue > 21 || value > dealerValue) {
          game.outcome[i] = 'win';
          award(h, bet, handWin, false);
        } else if (value < dealerValue) {
          say(summary(h));
          loss(i, bet);
        } else {
          tieBreak(i, h, bet, value);
        }
        game.paid[i] = true;
      });
      end();
    }

    // Level with the dealer: the dealer draws until it is not, and a draw that stays level goes to the dealer.
    function tieBreak(i, h, bet, value) {
      const tied = isSplit() ? fill(MSG.handTie, { handnum: i + 1 }) : '';
      say(fill(MSG.dealerDrawCard, { hands: tied }).trimStart());
      let dealerValue = total(game.dealer);
      for (let draws = 0; draws < (RULES.tieDrawOnlyOneCard ? 1 : 20) && dealerValue === value; draws++) {
        const extra = draw();
        game.dealer.push(extra);
        dealerValue = total(game.dealer);
        say(fill(MSG.dealerDraws, { card: extra.text, cards: handText(game.dealer) }), RULES.dealerDrawDelayMs);
      }
      if (dealerValue > 21) {
        say(fill(MSG.dealerBusts, { cards: handText(game.dealer), total: dealerValue }));
        game.outcome[i] = 'win';
        award(h, bet, null, false);
      } else if (dealerValue > value) {
        say(summary(h));
        say(MSG.dealerBeatsYou);
        loss(i, bet);
      } else if (dealerValue === value) {
        say(summary(h));
        say(MSG.dealerTieWin);
        loss(i, bet);
      } else {
        game.outcome[i] = 'win';
        award(h, bet, null, false);
      }
    }

    function award(h, bet, handMsg, natural) {
      const won = natural ? bet + Math.floor(bet * RULES.blackjackPayout) : bet * 2;
      balance += won;
      const win = fill(natural ? MSG.blackjackWin : MSG.regularWin, { amount: formatNumber(won), points: RULES.pointsName });
      say(`${summary(h)} ${handMsg ? `${handMsg} ` : ''}${win} ${balanceMsg()}`);
    }

    function loss(i, bet) {
      game.outcome[i] = 'lose';
      if (isSplit()) {
        say(`${fill(MSG.handLost, { user: `@${game.user}`, handnum: i + 1 })} Lost ${formatNumber(bet)} ${RULES.pointsName}. ${balanceMsg()}`);
      } else {
        say(`@${game.user}, ${fill(MSG.loss, { amount: formatNumber(bet), points: RULES.pointsName })} ${balanceMsg()}`);
      }
    }

    function awardSpecial(type, h, bet, endAfter) {
      game.outcome[game.current] = type;
      const won = bet + Math.floor(bet * (type === 'charlie' ? 1.5 : 2));
      balance += won;
      const win = fill(MSG.regularWin, { amount: formatNumber(won), points: RULES.pointsName });
      say(`${summary(h)}\n@${game.user}, ${type === 'charlie' ? MSG.specialWin5Card : MSG.specialWin3Sevens} ${win} ${balanceMsg()}`);
      if (endAfter) end();
    }

    function end() {
      game.over = true;
      api.draw();
    }

    /* ---------- chat ---------- */

    const OTHER_MODES = ['!bjduel', '!accept', '!decline', '!house', 'join', 'deal', '!stats', '!allstats'];

    function handle(user, text) {
      const [word, ...rest] = text.trim().split(/\s+/);
      const command = word.toLowerCase();
      const live = game && !game.over;
      if (command === '!blackjack') { start(user, (rest[0] || '').toLowerCase()); return; }
      if (['hit', 'stand', 'double', 'split', 'insurance', 'surrender'].includes(command)) {
        if (!live) { api.say(fill(MSG.noActiveGame, { user: `@${user}` })); return; }
        if (command === 'hit') hit();
        else if (command === 'stand') stand();
        else if (command === 'double') doubleDown();
        else if (command === 'split') split();
        else if (command === 'insurance') say(fill(MSG.insuranceNotAvailable, { user: `@${user}` }));
        else say(fill(MSG.surrenderNotAvailable, { user: `@${user}` }));
        return;
      }
      if (command === 'repeat') {
        if (!live) { api.say(fill(MSG.noActiveGame, { user: `@${user}` })); return; }
        api.say(lastMessage || MSG.repeatNothing.replace('{user}', `@${user}`));
        return;
      }
      if (OTHER_MODES.includes(command)) {
        api.note(`${word} needs other chatters or saved stats, so it is not in the playground. The solo table is: !blackjack <bet>.`);
      }
    }

    return {
      handle, reset, overlay,
      get playing() { return !!(game && !game.over); },
    };
  }

  window.PlaygroundGames = window.PlaygroundGames || {};
  window.PlaygroundGames['Blackjack-Game'] = {
    hook: 'bjgOverlayState',
    title: 'The Blackjack overlay',
    idle: ['The table is empty', 'Type !blackjack in the chat to deal the first hand.'],
    welcome: 'You are "viewer" with 10.000 pretend Points. Deal in with !blackjack <bet>, then hit, stand, double or split.',
    note: 'The solo table with the game\'s default settings and its own chat lines.',
    quick: engine => engine.playing
      ? ['hit', 'stand', 'double', 'split']
      : ['!blackjack', '!blackjack 500', '!blackjack half', '!blackjack all'],
    create,
  };
})();
