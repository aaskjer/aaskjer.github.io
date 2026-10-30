/*
 * The projects shown on the site.
 *
 * Add, remove or reorder entries here. Stars, downloads, versions and the
 * "updated" date are refreshed live from the GitHub API when the page loads;
 * the numbers below are only the fallback for when that request fails.
 * Public repositories that are not listed here appear on their own under
 * "More on GitHub".
 *
 *   repo       repository name on GitHub (required)
 *   tagline    only a fallback: the site shows the short description from the repository's
 *              About box on GitHub (projects under "More on GitHub" too)
 *   section    'tools', 'games' or 'more' (under "More on GitHub", before the repositories GitHub adds)
 *   features   list of highlights, shown when the project is in the Featured box (see `featured` below)
 *   screenshot picture the Featured box shows instead of the scene (`screenshotFull` is what a
 *              click on it opens)
 *   scene      picture on top of the card, `sceneAlt` describes it; the card shows the
 *              smaller copy next to it (name-thumb.jpg), a click opens the full one
 *   logo       image file, or `mono` for a short text logo instead
 *   guide      { label, href } – href is a file in the repo or a full URL
 *   download   download link, defaults to the latest release
 *   page       the project's own page on this site, 'projects/<folder>/'; cards link there.
 *              _tools/update-pages.js writes it from _tools/project-page.html (run it after adding one).
 *              It shows the repository's README, Setup-Guide.md, Manual.md and FAQ.md as tabs,
 *              whichever exist, plus `moreDocs` ({ id, label, file }). A line `<!-- tab: Setup -->`
 *              in one of them starts another tab there (see TAB_MARKER in project.js). The Changelog tab is always
 *              there: CHANGELOG.md, or else the release notes, or else the commit history. A copy button
 *              for Import-String.md (`importString` if the file is somewhere else)
 *   description  for projects with a page: the text search engines show for it
 *   preview    for projects with a page: the text under a shared link to it, next to the
 *              `screenshot` (or else the `scene`)
 *   status     shown next to the version: 'dev' (yellow "In development"), 'complete' (green
 *              "Feature Complete": all planned features are in) or 'done' (finished: no label,
 *              the pink "Done" badge is switched off in main.js and project.js)
 *   statusSince  the day `status` last changed, e.g. '2026-10-28'; set it with every change, it
 *              puts the project in the Featured box for a while
 */
window.SITE = {
  user: 'aaskjer',
  twitch: 'https://www.twitch.tv/aaskjer',
  // Umami Cloud visitor statistics: the website ID from the Umami dashboard; leave empty to switch them off
  stats: { script: 'https://cloud.umami.is/script.js', websiteId: '1fd3cb1c-351d-4e3c-aed9-925125642e95', domain: 'aaskjer.github.io' },
  // A repository without a release that holds only README and LICENSE shows a red "Coming Soon"
  // instead of its buttons. Repositories listed here show it too although they already have
  // files, until their first release is out.
  comingSoon: [],
  // The Featured box above the stream tools. A project gets in for `days` after a release (a
  // pre-release too) or a change of its status, and for at least `downloads.min` downloads in the
  // last `downloads.days` days. The newest reasons come first, at most `max` take turns, and
  // `fallback` is shown while no project has a reason. The download history is the stats branch of
  // this repository, recorded once a day by .github/workflows/download-counts.yml.
  featured: { fallback: 'TwitchSentry', days: 7, max: 5, downloads: { days: 7, min: 20 } },
  projects: [
    {
      repo: 'TwitchSentry',
      page: 'projects/twitchsentry/',
      status: 'dev',
      name: 'TwitchSentry',
      section: 'tools',
      logo: 'assets/img/projects/twitchsentry.png',
      scene: 'assets/img/scenes/twitchsentry.jpg',
      sceneAlt: 'TwitchSentry removes a viewer-selling spam message and an unauthorized link from chat, then a moderator gives a link permit.',
      screenshot: 'assets/img/twitchsentry-app.jpg',
      screenshotFull: 'assets/img/twitchsentry-app-full.jpg',
      tagline: 'TwitchSentry is a fully automated moderation suite designed for quiet and crowded chats. TwitchSentry is capable to replace a human moderator in small communities and works great as backup in big communities.',
      description: 'A moderation suite for Streamer.bot: deletes fake gift links, sketchy URLs and copy-paste scams in Twitch chat, guards against raids and follow waves, and tells you what was removed and why.',
      preview: 'Your smart chat bodyguard for Twitch: scam links, spam and hate raids handled. A free Streamer.bot extension.',
      features: [
        'Blocks links from untrusted viewers, with a link whitelist',
        'Spam scoring that recognises scam adverts',
        'Raid, hate raid and follow wave protection',
        'Spam Learner and a bot list shared between channels',
        'Twitch warnings, link permits, link checks and vote kicks',
        'Alerts via Discord, Stoat, GameVox, ntfy or Windows',
      ],
      platforms: ['Twitch'],
      tags: ['Discord', 'Stoat', 'GameVox', 'ntfy', 'Windows'],
      guide: { label: 'Manual', href: 'Manual.md' },
      importString: 'Utilities/Import-String.md',
      moreDocs: [{ id: 'comparison', label: 'Comparison', file: 'Utilities/Comparison.md' }],
      version: 'v4.0.1', stars: 4, downloads: 93,
    },
    {
      repo: 'Better-Stream-Announcements',
      page: 'projects/better-stream-announcements/',
      status: 'dev',
      statusSince: '2026-10-24',
      name: 'Better Stream Announcements',
      section: 'tools',
      logo: 'assets/img/projects/better-stream-announcements.png',
      scene: 'assets/img/scenes/better-stream-announcements.jpg',
      sceneAlt: 'A go-live announcement in Discord with the stream title, game, viewers, a preview image and a Watch Stream button.',
      tagline: 'Automatically announce your and your friend\'s livestream on Discord, Stoat, GameVox.',
      description: 'Go-live and stream-ended announcements in Discord, Stoat or GameVox for your own channel and your streamer friends, with slash commands and a settings window. A Streamer.bot extension for Twitch, YouTube, Kick, Owncast, Rumble, Picarto and TikTok.',
      preview: 'Go-live and stream-ended embeds in Discord, Stoat or GameVox, for you and your streamer friends. A free Streamer.bot extension.',
      platforms: ['Twitch', 'YouTube', 'Kick', 'Owncast', 'Rumble', 'Picarto', 'TikTok'],
      tags: ['Discord', 'Stoat', 'GameVox'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v2.0.0', stars: 1, downloads: 43,
    },
    {
      repo: 'SBRefFix',
      page: 'projects/sbreffix/',
      status: 'done',
      statusSince: '2026-10-26',
      name: 'SBRefFix',
      // a helper for anyone sharing Streamer.bot exports, not a stream tool
      section: 'more',
      mono: '.sb',
      scene: 'assets/img/scenes/sbreffix.jpg',
      sceneAlt: 'SBRefFix in a console window, rewriting the .NET references of a Streamer.bot export.',
      tagline: 'Fixes the broken .NET references in a Streamer.bot v1.0.7 export.',
      description: 'Fixes the .NET references in a Streamer.bot export, so the import compiles on every PC, wherever Streamer.bot is installed. A small PowerShell tool for Windows.',
      preview: 'Fixes the .NET references in Streamer.bot exports, so imports compile on every PC. A free PowerShell tool.',
      platforms: ['Windows'],
      tags: ['PowerShell'],
      download: 'https://github.com/aaskjer/SBRefFix/releases/latest/download/SBRefFix.zip',
      downloadLabel: 'Download ZIP',
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 0, downloads: 0,
    },
    {
      repo: 'SuTo',
      page: 'projects/suto/',
      status: 'done',
      statusSince: '2026-10-27',
      name: 'Suggestions To',
      section: 'tools',
      mono: 'SuTo',
      scene: 'assets/img/scenes/suto.jpg',
      sceneAlt: 'Viewers type !suggestion in Twitch, YouTube and Kick chat, and each suggestion lands in a Discord channel with the viewer\'s name, platform and time.',
      tagline: 'Your chat has good ideas but you always struggle to remember them? Now your chat can write them down for you!',
      description: 'SuTo for Streamer.bot: viewers type !suggestion in Twitch, YouTube or Kick chat, and the idea lands in your Discord, Stoat or GameVox server with their name, platform and the time.',
      preview: 'Chat suggestions from Twitch, YouTube and Kick, straight to your Discord, Stoat or GameVox server. A free Streamer.bot import.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['Discord', 'Stoat', 'GameVox'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 0, downloads: 0,
    },
    {
      repo: 'OBSNotes',
      page: 'projects/obsnotes/',
      status: 'done',
      statusSince: '2026-10-27',
      name: 'OBS Notes',
      section: 'tools',
      logo: 'assets/img/projects/obsnotes.png',
      scene: 'assets/img/scenes/obsnotes.jpg',
      sceneAlt: 'Viewers write their Fran Bow clues into chat with !note, and each one sticks on stream as a post-it.',
      tagline: 'Can\'t remember the code of the combination lock? Your chat can step-in an add a post-it in OBS for you!',
      description: 'OBS Notes for Streamer.bot: viewers write codes, quest hints and names into Twitch, YouTube or Kick chat with !note, and each note sticks on stream as a post-it, one list per game.',
      preview: 'Chat writes it down, OBS shows it as a post-it: notes from Twitch, YouTube and Kick chat, one list per game. A free Streamer.bot import.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 0, downloads: 0,
    },
    {
      repo: 'ChatCalendar',
      page: 'projects/chatcalendar/',
      status: 'complete',
      statusSince: '2026-10-27',
      name: 'Chat Calendar',
      section: 'tools',
      logo: 'assets/img/projects/chatcalendar.png',
      scene: 'assets/img/scenes/chatcalendar.jpg',
      sceneAlt: 'Chat on Christmas Day: the bot wishes every viewer a happy holiday, saves a birthday and lists the next holidays and birthdays.',
      tagline: 'Create your own calendar that display holidays, birthdays or other custom special days in your chat!',
      description: 'Chat Calendar for Streamer.bot: greets your Twitch, YouTube and Kick chat on public holidays of 100+ countries, birthdays and your own special days, and posts them to Discord, Stoat or GameVox.',
      preview: 'Holidays, birthdays and your own special days in your Twitch, YouTube and Kick chat, posted to Discord, Stoat or GameVox too. A free Streamer.bot import.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['Discord', 'Stoat', 'GameVox'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 0, downloads: 0,
    },
    {
      repo: 'Blackjack-Game',
      page: 'projects/blackjack-game/',
      status: 'complete',
      statusSince: '2026-10-28',
      name: 'Blackjack Game',
      section: 'games',
      logo: 'assets/img/projects/blackjack-game.png',
      scene: 'assets/img/scenes/blackjack-game.jpg',
      sceneAlt: 'A Blackjack duel on stream: both hands on the OBS overlay while chat plays with hit and stand.',
      tagline: 'You don\'t need to go to Las Vegas to play solid Strip Poker! Play against the CPU, another Player or together against the House!',
      description: 'A real hand of Blackjack against the dealer in chat, with splits, double downs and insurance, or a duel between two chatters. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Blackjack against the dealer or another chatter, with an OBS overlay. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v16.1.1', stars: 2, downloads: 147,
    },
    {
      repo: 'Classic-Chat-Gamble',
      page: 'projects/classic-chat-gamble/',
      status: 'done',
      statusSince: '2026-10-26',
      name: 'Classic Chat Gamble',
      section: 'games',
      logo: 'assets/img/projects/classic-chat-gamble.png',
      scene: 'assets/img/scenes/classic-chat-gamble.jpg',
      sceneAlt: 'Viewers gambling in chat with !gamble, and the game answering with wins, losses and a jackpot.',
      tagline: 'The most classic stream chat game ever! Highly customizable and always up to zero your balance!',
      description: 'The classic chat gamble: bet with numbers, keywords or percentages, chase jackpots, or run it on Twitch channel points. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Gamble points in chat with numbers, keywords or percentages and chase jackpots. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v24.1.0', stars: 1, downloads: 124,
    },
    {
      repo: 'Trivia-Game',
      page: 'projects/trivia-game/',
      status: 'dev',
      name: 'Trivia Game',
      section: 'games',
      logo: 'assets/img/projects/trivia-game.png',
      scene: 'assets/img/scenes/trivia-game.jpg',
      sceneAlt: 'A trivia round in chat: a question with four answers, the answers from chat and the winners.',
      tagline: 'Ready to put your knowledge to the test? Let\'s see how you work under pressure!',
      description: 'Quiz rounds straight in chat, with questions from the Open Trivia Database, your own list or both, plus blitz rounds and viewer suggestions. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Quiz rounds in chat, with blitz rounds and viewer suggestions. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v8.0.0', stars: 1, downloads: 64,
    },
    {
      repo: 'Slot-Machine-Game',
      page: 'projects/slot-machine-game/',
      status: 'done',
      statusSince: '2026-10-26',
      name: 'Slot Machine Game',
      section: 'games',
      logo: 'assets/img/projects/slot-machine-game.png',
      scene: 'assets/img/scenes/slot-machine-game.jpg',
      sceneAlt: 'Slot spins in chat: the reels, then the win, loss or jackpot message.',
      tagline: 'Who needs a casino if you can play your slots right here in the chat? Spin the wheels and reach for the Jackpool!',
      description: 'Chat spins the reels with emotes: adjustable odds, three to six reels, rare emotes pay more, and an optional jackpot pool. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'A slot machine in chat, with emote reels and a jackpot pool. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v15.0.0', stars: 2, downloads: 47,
    },
    {
      repo: 'Hangman-Game',
      page: 'projects/hangman-game/',
      status: 'complete',
      statusSince: '2026-10-28',
      name: 'Hangman Game',
      section: 'games',
      logo: 'assets/img/projects/hangman-game.png',
      scene: 'assets/img/scenes/hangman-game.jpg',
      sceneAlt: 'Hangman on stream: the OBS overlay shows the gallows and the half-solved word while chat guesses with !g.',
      tagline: 'One of the most iconic Pencil&Paper games. But the future is now, we play in OBS not on paper!',
      description: 'Hangman for the whole chat: one word, a row of blanks and everyone guessing at once, while the OBS overlay draws the gallows. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Hangman for the whole chat, with an OBS overlay. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v11.0.0', stars: 2, downloads: 16,
    },
    {
      repo: 'Battleship-Game',
      page: 'projects/battleship-game/',
      status: 'dev',
      name: 'Battleship Game',
      section: 'games',
      logo: 'assets/img/projects/battleship-game.png',
      scene: 'assets/img/scenes/battleship-game.jpg',
      sceneAlt: 'A Battleship match on stream: both boards on the OBS overlay while the viewer fires with !fire.',
      tagline: 'One of the iconic Pencil&Paper games now also available in chat and OBS overlay with heat click support!',
      description: 'Battleship on stream: chat commands a fleet against the Admiral, a CPU opponent that never sees your board, on a grid drawn live in OBS. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Chat plays Battleship against a CPU Admiral on an OBS overlay. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 1, downloads: 0,
    },
    {
      repo: 'RhymeTime',
      page: 'projects/rhymetime/',
      status: 'dev',
      name: 'RhymeTime',
      section: 'games',
      mono: 'RT',
      scene: 'assets/img/scenes/rhymetime.jpg',
      sceneAlt: 'A RhymeTime round on stream: the word STREAM with its ending marked, while chat answers in Twitch chat and a battle is won with HISTORY.',
      tagline: 'Does your chat have a way with words? One word, a ticking clock, and a rhyme that pays!',
      description: 'A word to rhyme with, a clock and a few attempts: chat stakes points and answers in ordinary chat, rhymes nobody listed count too, and a battle opens the word to everyone. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Chat races the clock to rhyme for points, solo or in a battle. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 0, downloads: 0,
    },
  ],
};
