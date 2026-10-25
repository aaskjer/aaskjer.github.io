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
 *   section    'tools' or 'games'
 *   featured   shown large at the top of its section, with `features` and `screenshot`
 *              (`screenshotFull` is what a click on it opens)
 *   scene      picture on top of the card, `sceneAlt` describes it; the card shows the
 *              smaller copy next to it (name-thumb.jpg), a click opens the full one
 *   logo       image file, or `mono` for a short text logo instead
 *   guide      { label, href } – href is a file in the repo or a full URL
 *   download   download link, defaults to the latest release
 *   page       the project's own page on this site (folder with an index.html); cards link there.
 *              It shows the repository's README, Setup-Guide.md, Manual.md and FAQ.md as tabs,
 *              whichever exist, plus `moreDocs` ({ id, label, file }). The Changelog tab is always
 *              there: CHANGELOG.md, or else the release notes, or else the commit history. A copy button
 *              for Import-String.md (`importString` if the file is somewhere else)
 *   status     'dev' (yellow "In development") or 'complete' (green "Complete"), shown next to the version
 */
window.SITE = {
  user: 'aaskjer',
  twitch: 'https://www.twitch.tv/aaskjer',
  // Umami Cloud visitor statistics: the website ID from the Umami dashboard; leave empty to switch them off
  stats: { script: 'https://cloud.umami.is/script.js', websiteId: '1fd3cb1c-351d-4e3c-aed9-925125642e95', domain: 'aaskjer.github.io' },
  projects: [
    {
      repo: 'TwitchSentry',
      page: 'twitchsentry/',
      status: 'dev',
      name: 'TwitchSentry',
      section: 'tools',
      featured: true,
      logo: 'assets/img/projects/twitchsentry.png',
      screenshot: 'assets/img/twitchsentry-app.jpg',
      screenshotFull: 'assets/img/twitchsentry-app-full.jpg',
      tagline: 'Your smart chat bodyguard. Deletes fake gift links, sketchy URLs and copy-paste scams, and tells you what each message said, who sent it and why it was removed.',
      features: [
        'Blocks links from untrusted viewers, with a link whitelist',
        'Spam scoring that recognises scam adverts',
        'Raid, hate raid and follow wave protection',
        'Spam Learner and a bot list shared between channels',
        'Twitch warnings, link permits, link checks and vote kicks',
        'Alerts via Discord, Stoat, GameVox, ntfy or Windows',
      ],
      platforms: ['Twitch'],
      tags: ['Discord', 'Stoat', 'GameVox'],
      guide: { label: 'Manual', href: 'Manual.md' },
      importString: 'Utilities/Import-String.md',
      moreDocs: [{ id: 'comparison', label: 'Comparison', file: 'Utilities/Comparison.md' }],
      version: 'v4.0.1', stars: 4, downloads: 93,
    },
    {
      repo: 'Better-Stream-Announcements',
      page: 'better-stream-announcements/',
      status: 'dev',
      name: 'Better Stream Announcements',
      section: 'tools',
      logo: 'assets/img/projects/better-stream-announcements.png',
      scene: 'assets/img/scenes/better-stream-announcements.jpg',
      sceneAlt: 'A go-live announcement in Discord with the stream title, game, viewers, a preview image and a Watch Stream button.',
      tagline: 'Go-live and stream-ended embeds in Discord, for your own channel and your streamer friends. Slash commands and a settings window included.',
      platforms: ['Twitch', 'YouTube', 'Kick', 'Owncast', 'Rumble', 'Picarto', 'TikTok'],
      tags: ['Discord'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v2.0.0', stars: 1, downloads: 43,
    },
    {
      repo: 'SBRefFix',
      page: 'sbreffix/',
      status: 'complete',
      name: 'SBRefFix',
      section: 'tools',
      mono: '.sb',
      scene: 'assets/img/scenes/sbreffix.jpg',
      sceneAlt: 'SBRefFix in a console window, rewriting the .NET references of a Streamer.bot export.',
      tagline: 'Fixes the .NET references in a Streamer.bot export, so the import compiles on every PC, wherever Streamer.bot is installed.',
      platforms: ['Windows'],
      tags: ['PowerShell'],
      download: 'https://github.com/aaskjer/SBRefFix/archive/refs/heads/main.zip',
      downloadLabel: 'Download ZIP',
      guide: { label: 'How to use', href: 'https://github.com/aaskjer/SBRefFix#how-to-use-it' },
      version: null, stars: 0, downloads: 0,
    },
    {
      repo: 'Blackjack-Game',
      page: 'blackjack-game/',
      status: 'dev',
      name: 'Blackjack Game',
      section: 'games',
      logo: 'assets/img/projects/blackjack-game.png',
      scene: 'assets/img/scenes/blackjack-game.jpg',
      sceneAlt: 'A Blackjack duel on stream: both hands on the OBS overlay while chat plays with hit and stand.',
      tagline: 'A real hand of Blackjack against the dealer, with splits, double downs and insurance. Or challenge another chatter with !duel.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v16.1.1', stars: 2, downloads: 147,
    },
    {
      repo: 'Classic-Chat-Gamble',
      page: 'classic-chat-gamble/',
      status: 'complete',
      name: 'Classic Chat Gamble',
      section: 'games',
      logo: 'assets/img/projects/classic-chat-gamble.png',
      scene: 'assets/img/scenes/classic-chat-gamble.jpg',
      sceneAlt: 'Viewers gambling in chat with !gamble, and the game answering with wins, losses and a jackpot.',
      tagline: 'The most classic chat game. Bet with numbers, keywords or percentages, chase jackpots, or run it on Twitch channel points.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v24.1.0', stars: 1, downloads: 124,
    },
    {
      repo: 'Trivia-Game',
      page: 'trivia-game/',
      status: 'dev',
      name: 'Trivia Game',
      section: 'games',
      logo: 'assets/img/projects/trivia-game.png',
      scene: 'assets/img/scenes/trivia-game.jpg',
      sceneAlt: 'A trivia round in chat: a question with four answers, the answers from chat and the winners.',
      tagline: 'Quiz rounds straight in chat. Questions from the Open Trivia Database, your own list or both, with blitz rounds and viewer suggestions.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v8.0.0', stars: 1, downloads: 64,
    },
    {
      repo: 'Slot-Machine-Game',
      page: 'slot-machine-game/',
      status: 'complete',
      name: 'Slot Machine Game',
      section: 'games',
      logo: 'assets/img/projects/slot-machine-game.png',
      scene: 'assets/img/scenes/slot-machine-game.jpg',
      sceneAlt: 'Slot spins in chat: the reels, then the win, loss or jackpot message.',
      tagline: 'Chat spins the reels with emotes. Adjustable odds, three to six reels, rare emotes pay more, and an optional jackpot pool.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v15.0.0', stars: 2, downloads: 47,
    },
    {
      repo: 'Hangman-Game',
      page: 'hangman-game/',
      status: 'dev',
      name: 'Hangman Game',
      section: 'games',
      logo: 'assets/img/projects/hangman-game.png',
      scene: 'assets/img/scenes/hangman-game.jpg',
      sceneAlt: 'Hangman on stream: the OBS overlay shows the gallows and the half-solved word while chat guesses with !g.',
      tagline: 'One word, a row of blanks and everyone guessing at once. The OBS overlay draws the gallows as chat guesses.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v11.0.0', stars: 2, downloads: 16,
    },
    {
      repo: 'Battleship-Game',
      page: 'battleship-game/',
      status: 'dev',
      name: 'Battleship Game',
      section: 'games',
      logo: 'assets/img/projects/battleship-game.png',
      scene: 'assets/img/scenes/battleship-game.jpg',
      sceneAlt: 'A Battleship match on stream: both boards on the OBS overlay while the viewer fires with !fire.',
      tagline: 'Chat commands a fleet against the Admiral, a CPU opponent that never sees your board, on a grid drawn live in OBS.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 1, downloads: 0,
    },
  ],
};
