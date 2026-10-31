/*
 * Trivia Game's rules for the playground (see assets/js/playground.js): one viewer's rounds as
 * Trivia_Game.cs plays them with its default settings and its chat lines word for word, countdown
 * and all. By default the game asks the Open Trivia Database for its questions, which a page on
 * this site cannot reach, so the rounds draw from a sample written for the playground in opentdb's
 * categories and difficulties. Points are pretend: a balance of 10.000 that "Start over" fills
 * again. The leaderboard and the stats read what Streamer.bot saves and stay in the real game, and
 * the published import has no overlay, so the playground is the chat alone.
 */
(() => {
  'use strict';

  const USER_POINTS = 10000;
  const INT_MAX = 2147483647;
  const RULES = {
    pointsName: 'Points',
    separator: '.',
    answerTimeSeconds: 60,
    blitzAnswerTimeSeconds: 20,
    enableBlitzTrivia: true,
    blitzChance: 10,
    normalCountdownStartSeconds: 30,
    blitzCountdownStartSeconds: 10,
    autoStartNextRoundAfterSkip: true,
    announceEachAnswer: true,
    allowMultipleRounds: true,
    maxRoundsPerCommand: 10,
    delayBetweenRoundsSeconds: 5,
    allowCategoryChoice: true,
    defaultCategoryId: '0',
    awardPoints: true,
    baseWinPoints: 1234,
    easyMultiplier: 1.0,
    mediumMultiplier: 1.75,
    hardMultiplier: 2.5,
    veryHardMultiplier: 3.0,
    blitzMultiplier: 2.0,
    allowNumericAnswers: true,
    allowExactTextAnswers: true,
    allowNormalizedTextAnswers: true,
    allowFuzzyTextAnswers: true,
    fuzzyTolerance: 2,
    minLengthForFuzzy: 4,
    allowQuestionSuggestions: false,
    // TwitchMessageLimit: a longer line goes out in parts
    messageLimit: 490,
    // the time opentdb takes to hand over a question, the playground's own stand-in
    fetchMs: 700,
  };

  // Trivia_Game.cs's default chat lines
  const MSG = {
    alreadyActive: '⚠️ A trivia round is already active.',
    cannotSkip: '⚠️ Cannot skip — no round is currently accepting answers.',
    cannotForceEnd: '⚠️ Cannot force end — no round is currently accepting answers.',
    skipNotice: '⏭️ Question skipped!',
    forceEndNotice: '🛑 Forcefully ending the current question!',
    seriesStarted: '🎬 Starting {rounds} trivia rounds back to back!',
    seriesRoundHeader: '📍 Round {current} of {total}',
    seriesFinished: "🏁 That's all {total} rounds — thanks for playing!",
    seriesCancelled: '🛑 The remaining {remaining} round(s) were cancelled.',
    seriesClamped: '@{userName}, {requested} is above the limit — running {rounds} rounds instead.',
    fetchFailed: '❌ Failed to fetch a trivia question. Please try again later.',
    firstCountdownReminder: '⏰ {seconds} seconds left!',
    secondCountdownReminder: '⏰ {seconds} seconds left!',
    lastCountdownReminder: '⏰ Hurry! {seconds} seconds left!',
    answerAccepted: '@{userName}, your answer ‘{answer}’ is noted! ✅',
    alreadyAnswered: '@{userName}, you already submitted: ‘{answer}’ ⚠️',
    answerRecognizedVariation: '@{userName}, answer recognized with slight variation: ‘{answer}’.',
    answerAcceptedFuzzy: '@{userName}, ‘{answer}’ is close enough to ‘{correctAnswer}’ — recorded! ✅',
    blitzWinner: '🎉 Winner: @{userName}! The correct answer was: ‘{correctAnswer}’. 🏆',
    winners: '🎉 Winners: {winners}! The correct answer was: ‘{correctAnswer}’. 🏆',
    noCorrectAnswer: '❌ Nobody answered correctly. The answer was: ‘{correctAnswer}’.',
    pointsAwarded: '🏅 @{userName} earned {points} {pointsName}! Total: {total} {pointsName}.',
    questionPrefixNormal: '❓',
    questionPrefixBlitz: '⚡ Blitz Trivia ⚡',
    questionOptionFormat: '▶ {index}. {answer}',
    questionFooterDetailed: '| 🌟 {difficulty} | 📚 {category} | ⏳ {seconds}s to answer!',
    addictedAlreadyOnList: '@{userName}, {targetUser} is already on the addicted list.',
    addictedAdded: '@{userName}, {targetUser} added to the addicted list — 50% win penalty applied. 🙏',
    addictedNotOnList: '@{userName}, {targetUser} is not on the addicted list.',
    addictedRemoved: '@{userName}, {targetUser} removed from the addicted list.',
    addictedUsage: '@{userName}, usage: !addicted add <user>  or  !addicted remove <user>',
    categoryChosen: '📚 Category for this round: {category}',
    categoryUnknown: '@{userName}, I have no category called ‘{category}’. Available: {categories}',
    suggestDisabled: '@{userName}, question suggestions are switched off right now.',
  };

  /* ---------- categories ---------- */

  // opentdb's categories: the id, the name chat picks it by (OpenTdbCategories), and the name
  // opentdb puts on its questions, which the question's footer shows.
  const CATEGORIES = [
    [9, 'General Knowledge', 'General Knowledge'], [10, 'Books', 'Entertainment: Books'],
    [11, 'Film', 'Entertainment: Film'], [12, 'Music', 'Entertainment: Music'],
    [13, 'Musicals & Theatre', 'Entertainment: Musicals & Theatres'], [14, 'Television', 'Entertainment: Television'],
    [15, 'Video Games', 'Entertainment: Video Games'], [16, 'Board Games', 'Entertainment: Board Games'],
    [17, 'Science & Nature', 'Science & Nature'], [18, 'Computers', 'Science: Computers'],
    [19, 'Mathematics', 'Science: Mathematics'], [20, 'Mythology', 'Mythology'], [21, 'Sports', 'Sports'],
    [22, 'Geography', 'Geography'], [23, 'History', 'History'], [24, 'Politics', 'Politics'], [25, 'Art', 'Art'],
    [26, 'Celebrities', 'Celebrities'], [27, 'Animals', 'Animals'], [28, 'Vehicles', 'Vehicles'],
    [29, 'Comics', 'Entertainment: Comics'], [30, 'Gadgets', 'Science: Gadgets'],
    [31, 'Japanese Manga & Anime', 'Entertainment: Japanese Anime & Manga'],
    [32, 'Cartoons & Animations', 'Entertainment: Cartoon & Animations'],
  ];
  const API_NAME = Object.fromEntries(CATEGORIES.map(([id, , api]) => [id, api]));

  // CategoryAliases: the short forms viewers type, in the order the game tries them
  const ALIASES = [
    ['general', 9], ['gk', 9], ['book', 10], ['literature', 10], ['movie', 11], ['movies', 11], ['films', 11],
    ['songs', 12], ['musicals', 13], ['theatre', 13], ['theater', 13], ['tv', 14], ['shows', 14],
    ['games', 15], ['gaming', 15], ['videogame', 15], ['boardgame', 16], ['science', 17], ['nature', 17],
    ['sci', 17], ['computer', 18], ['it', 18], ['tech', 18], ['technology', 18], ['math', 19], ['maths', 19],
    ['myth', 20], ['myths', 20], ['sport', 21], ['geo', 22], ['hist', 23], ['celebs', 26], ['celebrity', 26],
    ['animal', 27], ['cars', 28], ['vehicle', 28], ['comic', 29], ['gadget', 30], ['anime', 31], ['manga', 31],
    ['cartoon', 32], ['cartoons', 32], ['animation', 32],
  ];

  /* ---------- the questions ---------- */

  // PLAYGROUND SAMPLES, not the game's: Trivia Game has no questions of its own and asks opentdb
  // for each round, which this site's content policy does not let a page reach. These were written
  // for the playground in opentdb's shape - its 24 categories, easy, medium and hard, four options
  // or True/False - so rounds, category choice and payouts play the way they do on stream.
  // [category id, difficulty, question, correct answer, ...wrong answers]
  const QUESTIONS = [
    [9, 'e', 'How many days are there in a leap year?', '366', '365', '364', '367'],
    [9, 'e', 'What colour do you get by mixing blue and yellow?', 'Green', 'Purple', 'Orange', 'Brown'],
    [9, 'e', "A baker's dozen is 13.", 'True', 'False'],
    [9, 'm', 'Which language has the most native speakers in the world?', 'Mandarin Chinese', 'English', 'Spanish', 'Hindi'],
    [9, 'm', 'In which city is the Golden Gate Bridge?', 'San Francisco', 'Los Angeles', 'Seattle', 'San Diego'],
    [9, 'm', 'The Great Wall of China can be seen from the Moon with the naked eye.', 'False', 'True'],
    [9, 'h', 'Which letter does not appear in the name of any U.S. state?', 'Q', 'J', 'X', 'Z'],
    [9, 'h', 'Which country has the most time zones, counting its overseas territories?', 'France', 'Russia', 'United States', 'United Kingdom'],
    [9, 'h', 'What is the national animal of Scotland?', 'Unicorn', 'Lion', 'Red deer', 'Golden eagle'],
    [10, 'e', "Who wrote 'Romeo and Juliet'?", 'William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'],
    [10, 'e', "Who wrote 'The Hobbit'?", 'J. R. R. Tolkien', 'C. S. Lewis', 'George R. R. Martin', 'Terry Pratchett'],
    [10, 'm', "What is the name of the captain who hunts the whale in 'Moby-Dick'?", 'Ahab', 'Nemo', 'Hook', 'Queequeg'],
    [10, 'm', "George Orwell's '1984' was first published in 1949.", 'True', 'False'],
    [10, 'h', "What is Mr. Darcy's first name in 'Pride and Prejudice'?", 'Fitzwilliam', 'Charles', 'George', 'Edward'],
    [11, 'e', "What is the name of the cowboy doll in 'Toy Story'?", 'Woody', 'Buzz Lightyear', 'Jessie', 'Rex'],
    [11, 'e', "Steven Spielberg directed the 1975 film 'Jaws'.", 'True', 'False'],
    [11, 'm', 'Which 1997 film won the Academy Award for Best Picture?', 'Titanic', 'Good Will Hunting', 'As Good as It Gets', 'L.A. Confidential'],
    [11, 'h', "Who played the T-1000 in 'Terminator 2: Judgment Day'?", 'Robert Patrick', 'Arnold Schwarzenegger', 'Michael Biehn', 'Edward Furlong'],
    [12, 'e', "Which band released the album 'Abbey Road'?", 'The Beatles', 'The Rolling Stones', 'Pink Floyd', 'The Who'],
    [12, 'e', 'Freddie Mercury was the lead singer of Queen.', 'True', 'False'],
    [12, 'm', 'How many keys does a standard modern piano have?', '88', '76', '96', '104'],
    [12, 'm', 'Which instrument did the jazz musician Miles Davis play?', 'Trumpet', 'Saxophone', 'Piano', 'Trombone'],
    [12, 'h', "Which composer wrote 'The Four Seasons'?", 'Antonio Vivaldi', 'Johann Sebastian Bach', 'Wolfgang Amadeus Mozart', 'George Frideric Handel'],
    [13, 'e', "Which musical features the song 'Memory'?", 'Cats', 'Les Misérables', 'Evita', 'The Phantom of the Opera'],
    [13, 'm', "Who wrote the music and lyrics of 'Hamilton'?", 'Lin-Manuel Miranda', 'Stephen Sondheim', 'Andrew Lloyd Webber', 'Jason Robert Brown'],
    [13, 'm', "'West Side Story' is based on Shakespeare's 'Romeo and Juliet'.", 'True', 'False'],
    [13, 'h', 'Which musical follows the former convict Jean Valjean?', 'Les Misérables', 'The Phantom of the Opera', 'Miss Saigon', 'Cabaret'],
    [14, 'e', "In 'Friends', what is the name of the coffee house the friends meet in?", 'Central Perk', 'The Grind', "Monk's Café", 'Java Joe'],
    [14, 'e', "'Game of Thrones' is based on the book series 'A Song of Ice and Fire'.", 'True', 'False'],
    [14, 'm', "Which subject does Walter White teach in 'Breaking Bad'?", 'Chemistry', 'Physics', 'Biology', 'Mathematics'],
    [14, 'h', "What is the name of the android officer in 'Star Trek: The Next Generation'?", 'Data', 'Worf', 'William Riker', 'Geordi La Forge'],
    [15, 'e', 'Which princess does Mario usually set out to rescue?', 'Princess Peach', 'Princess Zelda', 'Princess Daisy', 'Rosalina'],
    [15, 'e', 'Pac-Man first came out in arcades in 1980.', 'True', 'False'],
    [15, 'm', "Which company developed 'Half-Life'?", 'Valve', 'id Software', 'Bungie', 'Epic Games'],
    [15, 'h', "In which year did 'Minecraft' reach its full release, version 1.0?", '2011', '2009', '2010', '2012'],
    [16, 'e', 'How many squares are there on a chessboard?', '64', '36', '81', '100'],
    [16, 'e', 'In chess, which piece only ever moves diagonally?', 'Bishop', 'Rook', 'Knight', 'Queen'],
    [16, 'm', 'In the US edition of Monopoly, which property costs the most?', 'Boardwalk', 'Park Place', 'Marvin Gardens', 'Pennsylvania Avenue'],
    [16, 'm', 'In English Scrabble, the letter Q is worth 10 points.', 'True', 'False'],
    [17, 'e', 'Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Jupiter', 'Mercury'],
    [17, 'e', 'What is the chemical symbol for gold?', 'Au', 'Ag', 'Gd', 'Go'],
    [17, 'm', 'Sound travels faster in water than in air.', 'True', 'False'],
    [17, 'm', "Which gas makes up most of Earth's atmosphere?", 'Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide'],
    [17, 'h', 'How many bones are there in the adult human body?', '206', '196', '212', '226'],
    [18, 'e', "What does 'CPU' stand for?", 'Central Processing Unit', 'Central Program Utility', 'Computer Personal Unit', 'Central Peripheral Unit'],
    [18, 'e', "'HTML' stands for 'Hypertext Markup Language'.", 'True', 'False'],
    [18, 'm', 'How is the decimal number 10 written in binary?', '1010', '1100', '1001', '0110'],
    [18, 'h', 'Who invented the World Wide Web?', 'Tim Berners-Lee', 'Vint Cerf', 'Bill Gates', 'Linus Torvalds'],
    [19, 'e', 'What is 7 multiplied by 8?', '56', '54', '58', '64'],
    [19, 'e', 'What is the square root of 144?', '12', '11', '14', '16'],
    [19, 'm', 'Pi is a rational number.', 'False', 'True'],
    [19, 'h', 'What is the smallest prime number greater than 100?', '101', '103', '107', '109'],
    [20, 'e', 'Who is the king of the gods in Greek mythology?', 'Zeus', 'Poseidon', 'Hades', 'Apollo'],
    [20, 'e', "In Greek mythology, Medusa's gaze turned people to stone.", 'True', 'False'],
    [20, 'm', "What is the name of Thor's hammer in Norse mythology?", 'Mjölnir', 'Gungnir', 'Gram', 'Draupnir'],
    [20, 'h', 'Which Egyptian god is usually shown with the head of a jackal?', 'Anubis', 'Horus', 'Thoth', 'Sobek'],
    [21, 'e', 'How many players does a football (soccer) team have on the pitch?', '11', '9', '10', '12'],
    [21, 'e', 'A marathon is about 42.2 kilometres long.', 'True', 'False'],
    [21, 'm', 'In tennis, what is a score of zero called?', 'Love', 'Nil', 'Duck', 'Blank'],
    [21, 'h', 'Which country won the first FIFA World Cup in 1930?', 'Uruguay', 'Argentina', 'Brazil', 'Italy'],
    [22, 'e', 'Which is the largest ocean on Earth?', 'Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    [22, 'm', 'What is the capital of Australia?', 'Canberra', 'Sydney', 'Melbourne', 'Perth'],
    [22, 'm', 'The Nile flows into the Mediterranean Sea.', 'True', 'False'],
    [22, 'h', 'Which country has the most natural lakes?', 'Canada', 'Finland', 'Russia', 'United States'],
    [23, 'e', 'In which year did World War II end?', '1945', '1944', '1946', '1939'],
    [23, 'e', 'Who was the first person to walk on the Moon?', 'Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'Michael Collins'],
    [23, 'm', 'The Berlin Wall fell in 1989.', 'True', 'False'],
    [23, 'h', 'Which empire did Mansa Musa rule?', 'Mali Empire', 'Songhai Empire', 'Ghana Empire', 'Ottoman Empire'],
    [24, 'e', 'Who was the first female Prime Minister of the United Kingdom?', 'Margaret Thatcher', 'Theresa May', 'Liz Truss', 'Barbara Castle'],
    [24, 'm', 'How many member states does the United Nations have?', '193', '185', '195', '200'],
    [24, 'm', 'The President of the United States must be at least 35 years old.', 'True', 'False'],
    [24, 'h', 'Which city is the official seat of the European Parliament?', 'Strasbourg', 'Brussels', 'Luxembourg', 'The Hague'],
    [25, 'e', "Who painted the 'Mona Lisa'?", 'Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh'],
    [25, 'e', "Claude Monet painted 'The Starry Night'.", 'False', 'True'],
    [25, 'm', 'Which painter cut off part of his own ear?', 'Vincent van Gogh', 'Pablo Picasso', 'Claude Monet', 'Salvador Dalí'],
    [25, 'h', 'In which city is the Prado Museum?', 'Madrid', 'Barcelona', 'Lisbon', 'Seville'],
    [26, 'e', "Which singer is known as the 'King of Pop'?", 'Michael Jackson', 'Elvis Presley', 'Prince', 'Justin Timberlake'],
    [26, 'e', "Which boxer called himself 'The Greatest'?", 'Muhammad Ali', 'Mike Tyson', 'Joe Frazier', 'George Foreman'],
    [26, 'm', 'Marilyn Monroe was born Norma Jeane Mortenson.', 'True', 'False'],
    [26, 'h', 'What was the birth name of the escape artist Harry Houdini?', 'Erik Weisz', 'Harold Hughes', 'Henryk Wolf', 'Emil Hofmann'],
    [27, 'e', 'What is the largest animal on Earth?', 'Blue whale', 'African elephant', 'Sperm whale', 'Whale shark'],
    [27, 'e', 'A spider has eight legs.', 'True', 'False'],
    [27, 'm', 'What is a group of crows called?', 'A murder', 'A pride', 'A pack', 'A parliament'],
    [27, 'h', 'Which bird lays the largest eggs?', 'Ostrich', 'Emu', 'Albatross', 'Andean condor'],
    [28, 'e', 'Which company makes the Model S electric car?', 'Tesla', 'Ford', 'BMW', 'Audi'],
    [28, 'e', "What does 'SUV' stand for?", 'Sport Utility Vehicle', 'Super Urban Vehicle', 'Standard Utility Van', 'Sport Use Vehicle'],
    [28, 'm', 'In which country was the car maker Volvo founded?', 'Sweden', 'Norway', 'Germany', 'Denmark'],
    [28, 'h', 'The Ford Model T first went into production in 1908.', 'True', 'False'],
    [29, 'e', "What is Superman's home planet?", 'Krypton', 'Apokolips', 'Thanagar', 'Oa'],
    [29, 'e', "What is Batman's secret identity?", 'Bruce Wayne', 'Clark Kent', 'Peter Parker', 'Tony Stark'],
    [29, 'm', "Spider-Man first appeared in 'Amazing Fantasy' #15.", 'True', 'False'],
    [29, 'h', 'Which artist co-created Spider-Man with Stan Lee?', 'Steve Ditko', 'Jack Kirby', 'John Romita Sr.', 'Todd McFarlane'],
    [30, 'e', 'Which company makes the iPhone?', 'Apple', 'Samsung', 'Google', 'Nokia'],
    [30, 'm', "What does 'USB' stand for?", 'Universal Serial Bus', 'Universal System Bus', 'Unified Serial Band', 'Universal Signal Bridge'],
    [30, 'm', 'In which year did the first iPhone go on sale?', '2007', '2005', '2006', '2008'],
    [30, 'h', "Nintendo's original Game Boy came out in 1989.", 'True', 'False'],
    [31, 'e', "Which Pokémon is Ash Ketchum's first partner in the 'Pokémon' anime?", 'Pikachu', 'Charmander', 'Bulbasaur', 'Squirtle'],
    [31, 'e', "Who is the title character of 'Naruto'?", 'Naruto Uzumaki', 'Sasuke Uchiha', 'Kakashi Hatake', 'Sakura Haruno'],
    [31, 'm', "Which studio made 'Spirited Away'?", 'Studio Ghibli', 'Toei Animation', 'Madhouse', 'Kyoto Animation'],
    [31, 'm', "'Dragon Ball' was created by Akira Toriyama.", 'True', 'False'],
    [32, 'e', "In 'The Simpsons', what is the name of Bart's sister who plays the saxophone?", 'Lisa', 'Maggie', 'Marge', 'Patty'],
    [32, 'e', 'SpongeBob SquarePants lives in a pineapple under the sea.', 'True', 'False'],
    [32, 'm', 'What breed of dog is Scooby-Doo?', 'Great Dane', 'Bloodhound', 'Beagle', 'Labrador Retriever'],
    [32, 'h', 'What was the first feature-length animated film Disney released?', 'Snow White and the Seven Dwarfs', 'Pinocchio', 'Fantasia', 'Bambi'],
  ];
  const DIFFICULTY = { e: 'easy', m: 'medium', h: 'hard' };

  /* ---------- text ---------- */

  // Fmt: {key} → its value; an unknown key stays as it is
  const fill = (text, values) => text.replace(/\{(\w+)\}/g, (all, key) => key in values ? String(values[key]) : all);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  // OrdinalIgnoreCase
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  // RoundPts: Math.Round with MidpointRounding.AwayFromZero
  const roundPts = value => Math.sign(value) * Math.round(Math.abs(value));

  // 12345 → "12.345", as FormatNumber with the "." separator
  function formatNumber(value) {
    const digits = String(Math.round(Math.abs(value)));
    let out = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) out += RULES.separator;
      out += digits[i];
    }
    return (value < 0 ? '-' : '') + out;
  }

  // SendPlatformMessage runs every line through WebUtility.HtmlDecode; these are the entities that
  // can turn up in what a viewer types back at it.
  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  function htmlDecode(text) {
    return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (all, name) => {
      if (name[0] !== '#') return Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : all;
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10FFFF && (code < 0xD800 || code > 0xDFFF) ? String.fromCodePoint(code) : all;
    });
  }

  // SplitMessage: breaks at the last newline or space before the limit
  function splitMessage(text, max) {
    const parts = [];
    let s = text;
    while (s.length > max) {
      let at = Math.max(s.lastIndexOf('\n', max - 1), s.lastIndexOf(' ', max - 1));
      if (at <= 0) at = max;
      parts.push(s.slice(0, at).trimEnd());
      s = s.slice(at).trimStart();
    }
    if (s.length > 0) parts.push(s);
    return parts;
  }

  /* ---------- answers ---------- */

  // NormalizeAnswer: lower case, single spaces, nothing but letters, digits and spaces (.NET's \w)
  function normalizeAnswer(value) {
    if (!value || !value.trim()) return '';
    return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{Mn}\p{Nd}\p{Pc}\s]/gu, '');
  }

  function levenshtein(a, b) {
    let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) {
        row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      previous = row;
    }
    return previous[b.length];
  }

  const isAllDigits = value => /^[0-9]+$/.test(value);

  // int.TryParse: an optional sign and ASCII digits that fit an int, or null
  function parseInt32(text) {
    if (!/^[+-]?[0-9]+$/.test(text)) return null;
    const value = Number(text);
    return value >= -INT_MAX - 1 && value <= INT_MAX ? value : null;
  }

  // ResolveAnswer: an option's exact text, its number, its text without case and punctuation, or a
  // close spelling - in that order. Null is a message that is no answer at all.
  function resolveAnswer(rawInput, answers) {
    if (!answers || answers.length === 0) return null;
    const input = (rawInput || '').trim();
    if (!input) return null;
    const literal = answers.find(a => same(a, input));

    if (RULES.allowExactTextAnswers && literal !== undefined) return { answer: literal, type: 'Exact', input };

    if (RULES.allowNumericAnswers && literal === undefined) {
      const index = parseInt32(input);
      if (index !== null && index > 0 && index <= answers.length) return { answer: answers[index - 1], type: 'Numeric', input };
    }

    if (RULES.allowNormalizedTextAnswers) {
      const normInput = normalizeAnswer(input);
      for (const a of answers) if (normalizeAnswer(a) === normInput) return { answer: a, type: 'Normalized', input };
    }

    if (RULES.allowFuzzyTextAnswers) {
      const normInput = normalizeAnswer(input);
      if (normInput.length >= RULES.minLengthForFuzzy) {
        let best = null;
        let bestDist = Infinity;
        let tied = false;
        for (const a of answers) {
          const normA = normalizeAnswer(a);
          if (normA.length < RULES.minLengthForFuzzy) continue;
          const dist = levenshtein(normInput, normA);
          // a number is right or wrong, never close
          const tolerance = isAllDigits(normInput) || isAllDigits(normA) ? 0 : RULES.fuzzyTolerance;
          if (dist > tolerance) continue;
          if (dist < bestDist) {
            bestDist = dist;
            best = a;
            tied = false;
          } else if (dist === bestDist) {
            tied = true;
          }
        }
        if (best !== null && !tied) return { answer: best, type: 'Fuzzy', input };
      }
    }
    return null;
  }

  /* ---------- !trivia's words ---------- */

  // CategoryKey: letters and digits only, lower case; the second key reads '&' as 'and'
  function categoryKey(value, ampersandAsAnd) {
    if (!value || !value.trim()) return '';
    const s = ampersandAsAnd ? value.split('&').join('and') : value;
    return s.replace(/[^\p{L}\p{Nd}]/gu, '').toLowerCase();
  }
  const categoryKeys = value => [categoryKey(value, false), categoryKey(value, true)];

  // ResolveCategoryChoice with opentdb as the source: a category's name, else an alias
  function resolveCategoryChoice(wanted) {
    if (!wanted || !wanted.trim()) return null;
    const keys = new Set(categoryKeys(wanted).filter(k => k.length > 0));
    if (keys.size === 0) return null;
    for (const [id, name] of CATEGORIES) {
      if (categoryKeys(name).some(k => keys.has(k))) return { openTdbId: id, display: name };
    }
    for (const [alias, id] of ALIASES) {
      if (keys.has(categoryKey(alias, false))) return { openTdbId: id, display: CATEGORIES.find(c => c[0] === id)[1] };
    }
    return null;
  }

  // SelectableCategoryNames, sorted the OrdinalIgnoreCase way
  const SELECTABLE = CATEGORIES.map(c => c[1])
    .sort((a, b) => { const x = a.toUpperCase(); const y = b.toUpperCase(); return x < y ? -1 : x > y ? 1 : 0; })
    .join(', ');

  // ParseRoundCount: more digits than an int holds is still a request for too many rounds
  function parseRoundCount(digits) {
    const value = /^[0-9]+$/.test(digits) ? Number(digits) : Infinity;
    if (value > INT_MAX) return INT_MAX;
    return value < 1 ? null : value;
  }

  // The round count half of SplitRoundsAndCategory, which !trivia hands its first word: a whole
  // number at either end. Like .NET's \d, \p{Nd} takes any script's digits.
  function roundCountOf(raw) {
    const text = raw.trim();
    if (!text) return null;
    const lead = /^(\p{Nd}+)(?:\s+|$)/u.exec(text);
    if (lead) return parseRoundCount(lead[1]);
    const tail = /(?:^|\s)(\p{Nd}+)$/u.exec(text);
    if (tail) return parseRoundCount(tail[1]);
    return null;
  }

  // ResolveRequestedCategoryText: the words after !trivia, less a leading round count
  function categoryTextOf(words) {
    const list = words.slice(0, 20);
    if (list.length > 0 && /^\p{Nd}+$/u.test(list[0])) list.shift();
    return list.join(' ').trim();
  }

  /* ---------- the game ---------- */

  function create(api) {
    const timers = new Set();
    let points;
    let session;
    let addictedUsers;
    let used;
    let toldWaits;

    function newSession() {
      return {
        status: 'idle', roundId: 0, question: null, answers: new Map(), isBlitz: false,
        roundsRemaining: 0, seriesTotal: 0, selectedCategory: null, abortPending: false,
        countdown: [], noMatchNoted: false,
      };
    }

    function reset() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
      points = USER_POINTS;
      session = newSession();
      addictedUsers = '';
      // the questions opentdb's session token has already served
      used = new Set();
      toldWaits = false;
    }
    reset();

    // the game's background tasks and countdowns: every one of them is cleared by reset()
    function later(fn, ms) {
      const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
      return id;
    }

    function stopCountdown() {
      for (const id of session.countdown) { clearTimeout(id); timers.delete(id); }
      session.countdown = [];
    }

    // SendPlatformMessage
    function send(text, delay) {
      const message = htmlDecode(text || '');
      if (!message.trim()) return;
      api.say(splitMessage(message, RULES.messageLimit).join('\n'), delay);
    }

    // a change of state with nothing to say, so the quick commands catch up
    const redraw = () => { if (api.draw) api.draw(); };

    const overlay = () => ({ active: false });

    /* ---------- questions ---------- */

    // FetchTriviaQuestionAsync, from the samples: the session token keeps a question from coming
    // back until the pool runs dry, and then it is reset and questions may repeat.
    function acquire(categoryId) {
      const pool = [];
      QUESTIONS.forEach((q, i) => { if (categoryId === '0' || q[0] === categoryId) pool.push(i); });
      if (pool.length === 0) return null;
      let fresh = pool.filter(i => !used.has(i));
      if (fresh.length === 0) {
        used.clear();
        fresh = pool;
      }
      const pick = fresh[Math.floor(Math.random() * fresh.length)];
      used.add(pick);
      const [category, difficulty, text, correct, ...wrong] = QUESTIONS[pick];
      // ParseQuestion: the wrong answers, then the right one, shuffled
      const answers = [...wrong, correct];
      for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
      }
      return { text, correct, answers, difficulty: DIFFICULTY[difficulty], category: API_NAME[category] };
    }

    function questionMessage(q, seconds, isBlitz) {
      return [
        isBlitz ? MSG.questionPrefixBlitz : MSG.questionPrefixNormal,
        q.text,
        ...q.answers.map((answer, i) => fill(MSG.questionOptionFormat, { index: i + 1, answer })),
        fill(MSG.questionFooterDetailed, { difficulty: q.difficulty.toUpperCase(), category: q.category, seconds }),
      ].join('\n');
    }

    /* ---------- a round ---------- */

    // QueuedRoundCount: the round a session in Starting is about to ask is counted back in
    function queuedRoundCount() {
      let queued = session.roundsRemaining;
      if (session.status === 'starting' && session.seriesTotal > 1) queued++;
      return queued;
    }

    // ConsumeAbort: force end between two questions leaves a flag, and the round about to start
    // drops itself here
    function consumeAbort() {
      if (!session.abortPending) return false;
      Object.assign(session, { abortPending: false, status: 'idle', question: null, roundsRemaining: 0, seriesTotal: 0, selectedCategory: null });
      redraw();
      return true;
    }

    // AbandonRound: no question to ask
    function abandon() {
      const abandoned = queuedRoundCount();
      Object.assign(session, { status: 'idle', abortPending: false, question: null, roundsRemaining: 0, seriesTotal: 0, selectedCategory: null });
      send(MSG.fetchFailed);
      if (abandoned > 0) send(fill(MSG.seriesCancelled, { remaining: abandoned }));
    }

    // StartRoundAsync: fetch the question, roll for blitz, ask it and start the countdown
    function startRound() {
      const categoryId = session.selectedCategory ? session.selectedCategory.openTdbId : RULES.defaultCategoryId;
      later(() => {
        if (consumeAbort()) return;
        const question = acquire(categoryId);
        if (!question) { abandon(); return; }

        const isBlitz = RULES.enableBlitzTrivia && Math.floor(Math.random() * 100) < clamp(RULES.blitzChance, 0, 100);
        const seconds = isBlitz ? RULES.blitzAnswerTimeSeconds : RULES.answerTimeSeconds;
        session.roundId++;
        Object.assign(session, { question, answers: new Map(), status: 'accepting', isBlitz, noMatchNoted: false });
        const seriesTotal = session.seriesTotal;
        const seriesCurrent = session.seriesTotal - session.roundsRemaining;

        if (seriesTotal > 1) send(fill(MSG.seriesRoundHeader, { current: seriesCurrent, total: seriesTotal }));
        send(questionMessage(question, seconds, isBlitz));
        runCountdown(session.roundId, seconds, isBlitz);
      }, RULES.fetchMs);
    }

    // RunCountdownAsync: three reminders, then the round times out
    function runCountdown(roundId, seconds, isBlitz) {
      if (seconds <= 0) return;
      const configured = isBlitz ? RULES.blitzCountdownStartSeconds : RULES.normalCountdownStartSeconds;
      const first = clamp(configured > 0 ? configured : Math.trunc(seconds / 2), 1, Math.max(1, seconds - 1));
      const second = clamp(Math.trunc(first / 2), 1, Math.max(1, first - 1));
      const third = clamp(Math.min(Math.trunc(second / 2), 5), 1, Math.max(1, second - 1));
      const marks = [];
      if (first < seconds) marks.push([first, MSG.firstCountdownReminder]);
      if (second < first) marks.push([second, MSG.secondCountdownReminder]);
      if (third < second) marks.push([third, MSG.lastCountdownReminder]);

      for (const [mark, template] of marks) {
        session.countdown.push(later(() => {
          if (session.roundId !== roundId || session.status !== 'accepting') return;
          send(fill(template, { seconds: mark }));
        }, (seconds - mark) * 1000));
      }
      session.countdown.push(later(() => {
        if (claim(roundId, false) !== null) resolveRound('timeout');
      }, seconds * 1000));
    }

    // TryClaimRound: the one decider of a round takes it over and stops its countdown. Null when
    // the round is no longer there to claim, otherwise the queued rounds a force end cancelled.
    function claim(roundId, cancelSeries) {
      if (session.status !== 'accepting' || session.roundId !== roundId) return null;
      session.status = 'resolving';
      stopCountdown();
      let cancelled = 0;
      if (cancelSeries) {
        cancelled = session.roundsRemaining;
        session.roundsRemaining = 0;
        session.seriesTotal = 0;
      }
      return cancelled;
    }

    /* ---------- the answer ---------- */

    // ProcessAnswerMessage: the first answer that matches an option counts, the rest are noted as
    // repeats, and in a blitz round the right one ends it
    function answer(user, text) {
      if (!user.trim() || !text.trim()) return;
      if (session.status !== 'accepting' || !session.question) {
        api.note(session.status === 'starting'
          ? 'The question is on its way: answers count once it is up.'
          : 'No round is running, so the game lets that pass. Start one with !trivia.');
        return;
      }
      const question = session.question;
      const match = resolveAnswer(text, question.answers);
      if (!match) {
        if (!session.noMatchNoted) {
          session.noMatchNoted = true;
          api.note(`That matches none of the options, so the game lets it pass. Answer with a number from 1 to ${question.answers.length} or the answer itself.`);
        }
        return;
      }

      const key = user.toLowerCase();
      const existing = session.answers.get(key);
      if (existing) {
        send(fill(MSG.alreadyAnswered, { userName: user, answer: existing.answer }));
        return;
      }
      session.answers.set(key, { user, answer: match.answer });
      const becameWinner = session.isBlitz && same(match.answer, question.correct);

      if (RULES.announceEachAnswer) feedback(user, match);
      if (becameWinner && claim(session.roundId, false) !== null) {
        resolveRound('blitz');
      } else if (!session.isBlitz && !toldWaits) {
        toldWaits = true;
        api.note(`A normal round pays everyone who is right once its ${RULES.answerTimeSeconds} seconds are up, so it runs to the end. !ForceEndTrivia ends it now and still scores your answer.`);
      }
    }

    // SendAnswerFeedback
    function feedback(user, match) {
      if (match.type === 'Fuzzy') {
        send(fill(MSG.answerAcceptedFuzzy, { userName: user, answer: match.input, correctAnswer: match.answer }));
      } else if (match.type === 'Normalized' && !same(match.answer, match.input)) {
        send(fill(MSG.answerRecognizedVariation, { userName: user, answer: match.input }));
      } else {
        send(fill(MSG.answerAccepted, { userName: user, answer: match.answer }));
      }
    }

    /* ---------- the end of a round ---------- */

    // ResolveRoundAsync: a skip says nothing, everything else names the answer and pays out
    function resolveRound(reason) {
      const skipped = reason === 'skipped';
      const question = session.question;
      const answers = [...session.answers.values()];
      const isBlitz = session.isBlitz;
      if (question && !skipped) {
        const correct = answers.filter(a => same(a.answer, question.correct));
        if (correct.length > 0) {
          // one chatter is never more than one winner, so PointsAwardedGrouped never comes up
          const paid = isBlitz ? [correct[0]] : correct;
          const payouts = paid.map(w => [w.user, award(w.user, question, isBlitz), points]);
          if (isBlitz) send(fill(MSG.blitzWinner, { userName: paid[0].user, correctAnswer: question.correct }));
          else send(fill(MSG.winners, { winners: paid.map(w => `@${w.user}`).join(', '), correctAnswer: question.correct }));
          if (RULES.awardPoints && payouts.length === 1) {
            const [userName, won, total] = payouts[0];
            send(fill(MSG.pointsAwarded, { userName, points: formatNumber(won), pointsName: RULES.pointsName, total: formatNumber(total) }));
          }
        } else {
          send(fill(MSG.noCorrectAnswer, { correctAnswer: question.correct }));
        }
      }
      finishRound(reason, skipped);
    }

    // AwardPoints: the base win, by difficulty, doubled in a blitz round, halved for the addicted
    function award(user, question, isBlitz) {
      if (!RULES.awardPoints) return 0;
      let win = RULES.baseWinPoints;
      switch (question.difficulty.toLowerCase()) {
        case 'easy': win = roundPts(win * RULES.easyMultiplier); break;
        case 'medium': win = roundPts(win * RULES.mediumMultiplier); break;
        case 'hard': win = roundPts(win * RULES.hardMultiplier); break;
        case 'very hard': win = roundPts(win * RULES.veryHardMultiplier); break;
      }
      if (isBlitz) win = roundPts(win * RULES.blitzMultiplier);
      // GetRoleMultiplier: the subscriber and VIP boosts are off by default
      const role = isAddicted(user) ? 0.5 : 1.0;
      if (role !== 1.0) win = roundPts(win * role);
      points = clamp(points + win, 0, INT_MAX);
      return win;
    }

    // FinishRound: back to idle, and the next round of a series - or after a skip - on its way
    function finishRound(reason, skipped) {
      const cancelSeries = reason === 'forceEnded';
      Object.assign(session, { status: 'idle', question: null, answers: new Map(), isBlitz: false });
      stopCountdown();
      let remaining = session.roundsRemaining;
      const seriesTotal = session.seriesTotal;
      const aborted = session.abortPending;
      if (cancelSeries || aborted) {
        remaining = 0;
        Object.assign(session, { roundsRemaining: 0, seriesTotal: 0, selectedCategory: null });
      }

      // a skip asks for another question, so a chosen category carries over
      const queueNext = !cancelSeries && !aborted
        && (remaining > 0 || (skipped && seriesTotal <= 1 && RULES.autoStartNextRoundAfterSkip));
      if (queueNext) {
        if (session.roundsRemaining > 0) session.roundsRemaining--;
        session.status = 'starting';
        // LaunchQueuedRound
        later(() => {
          if (consumeAbort()) return;
          startRound();
        }, Math.max(0, RULES.delayBetweenRoundsSeconds) * 1000);
        return;
      }
      session.abortPending = false;
      if (remaining === 0) session.selectedCategory = null;
      if (cancelSeries || aborted) return;
      if (seriesTotal > 1) {
        session.seriesTotal = 0;
        send(fill(MSG.seriesFinished, { total: seriesTotal }));
      }
    }

    /* ---------- commands ---------- */

    // RequireModeratorForStart and RequireModeratorForSkip are on by default, and !TA and force end
    // are for the Moderators group: in the playground the viewer holds those rights.

    // !trivia [rounds] [category]
    function start(user, words) {
      let requested = 1;
      let rounds = 1;
      const asked = RULES.allowMultipleRounds ? roundCountOf(words[0] || '') : null;
      if (asked !== null) {
        requested = asked;
        rounds = Math.min(requested, Math.max(1, RULES.maxRoundsPerCommand));
      }

      let choice = null;
      if (RULES.allowCategoryChoice) {
        const wanted = categoryTextOf(words);
        if (wanted) {
          choice = resolveCategoryChoice(wanted);
          if (!choice) {
            send(fill(MSG.categoryUnknown, { userName: user, category: wanted, categories: SELECTABLE }));
            return;
          }
        }
      }

      if (session.status !== 'idle') {
        send(MSG.alreadyActive);
        return;
      }
      Object.assign(session, { status: 'starting', abortPending: false, seriesTotal: rounds, roundsRemaining: rounds - 1, selectedCategory: choice });

      if (requested > rounds) send(fill(MSG.seriesClamped, { userName: user, requested, rounds }));
      if (rounds > 1) send(fill(MSG.seriesStarted, { rounds }));
      if (choice) send(fill(MSG.categoryChosen, { category: choice.display }));
      startRound();
    }

    // !SkipTrivia: the question goes unscored and unrevealed, and a new one follows
    function skip() {
      if (session.status !== 'accepting' || claim(session.roundId, false) === null) {
        send(MSG.cannotSkip);
        return;
      }
      send(MSG.skipNotice);
      resolveRound('skipped');
    }

    // !ForceEndTrivia: the round ends and still scores; a series stops, also between two questions
    function forceEnd() {
      const canForceEnd = session.status === 'accepting';
      const cancelQueued = !canForceEnd && (session.status === 'starting' || session.roundsRemaining > 0);
      const queued = cancelQueued ? queuedRoundCount() : 0;
      if (cancelQueued) Object.assign(session, { abortPending: true, roundsRemaining: 0, seriesTotal: 0 });

      const claimedQueued = canForceEnd ? claim(session.roundId, true) : null;
      const claimed = claimedQueued !== null;
      if (!claimed && !cancelQueued) {
        send(MSG.cannotForceEnd);
        return;
      }
      send(MSG.forceEndNotice);
      const dropped = claimed ? claimedQueued : queued;
      if (dropped > 0) send(fill(MSG.seriesCancelled, { remaining: dropped }));
      if (claimed) resolveRound('forceEnded');
    }

    // !TA [add|remove] <user>: the addicted list, kept the way configs.json keeps it
    const addictedSet = () => new Set(addictedUsers.split(',').map(x => x.trim().toLowerCase()).filter(x => x.length > 0));
    const isAddicted = user => addictedSet().has(user.toLowerCase());

    function addicted(user, words) {
      const input0 = (words[0] || '').trim().toLowerCase();
      const input1 = (words[1] || '').trim().toLowerCase();
      let action = 'add';
      let target = input0;
      if (input0 === 'add' || input0 === 'remove') {
        action = input0;
        target = input1;
      }
      if (!target.trim()) {
        send(fill(MSG.addictedUsage, { userName: user }));
        return;
      }
      target = target.replace(/^@+/, '');
      const list = addictedSet();
      if (action === 'add') {
        if (list.has(target)) {
          send(fill(MSG.addictedAlreadyOnList, { userName: user, targetUser: target }));
          return;
        }
        list.add(target);
        addictedUsers = [...list].join(',');
        send(fill(MSG.addictedAdded, { userName: user, targetUser: target }));
      } else {
        if (!list.has(target)) {
          send(fill(MSG.addictedNotOnList, { userName: user, targetUser: target }));
          return;
        }
        list.delete(target);
        addictedUsers = [...list].join(',');
        send(fill(MSG.addictedRemoved, { userName: user, targetUser: target }));
      }
    }

    // !suggest: suggestions are off by default
    function suggest(user) {
      if (!RULES.allowQuestionSuggestions) send(fill(MSG.suggestDisabled, { userName: user }));
    }

    /* ---------- chat ---------- */

    const COMMANDS = {
      '!trivia': start, '!skiptrivia': skip, '!forceendtrivia': forceEnd, '!fctrivia': forceEnd,
      '!ta': addicted, '!triviaaddict': addicted, '!suggest': suggest,
    };
    const SAVED_STATS = ['!tstats', '!triviascoreboard', '!ttb', '!triviascoreboardsearch', '!tss'];

    // A command goes to its handler; any other line is an answer, as the chat message trigger
    // hands it to the game.
    function handle(user, text) {
      const words = text.trim().split(/\s+/);
      const command = words[0].toLowerCase();
      if (Object.prototype.hasOwnProperty.call(COMMANDS, command)) {
        COMMANDS[command](user, words.slice(1));
        return;
      }
      if (SAVED_STATS.includes(command)) {
        api.note(`${words[0]} reads the stats Streamer.bot saves for every chatter, so it is not in the playground.`);
        return;
      }
      answer(user, text);
    }

    return {
      handle, reset, overlay,
      get accepting() { return session.status === 'accepting'; },
      get starting() { return session.status === 'starting'; },
      get answered() { return session.status === 'accepting' && session.answers.size > 0; },
      get options() { return session.question ? session.question.answers.slice() : []; },
      get points() { return points; },
    };
  }

  function quick(engine) {
    if (engine.answered) return ['!ForceEndTrivia', '!SkipTrivia'];
    if (engine.accepting) {
      const options = engine.options;
      // True/False by name, four options by number
      return [...(options.length === 2 ? options : options.map((_, i) => String(i + 1))), '!SkipTrivia', '!ForceEndTrivia'];
    }
    if (engine.starting) return ['!ForceEndTrivia'];
    return ['!trivia', '!trivia 3', '!trivia history', '!trivia video games'];
  }

  window.PlaygroundGames = window.PlaygroundGames || {};
  window.PlaygroundGames['Trivia-Game'] = {
    welcome: 'You are "viewer" with 10.000 pretend Points and the mod rights the game asks for to start and skip. Start a round with !trivia, then answer with the option\'s number or the answer itself.',
    note: 'One chatter\'s rounds with the game\'s default settings and its own chat lines, on sample questions written for the playground in place of the Open Trivia Database.',
    quick,
    create,
  };
})();
