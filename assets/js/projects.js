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
 *   logo       image file, or `mono` for a short text logo instead
 *   guide      { label, href } – href is a file in the repo or a full URL
 *   download   download link, defaults to the latest release
 */
window.SITE = {
  user: 'aaskjer',
  twitch: 'https://www.twitch.tv/aaskjer',
  projects: [
    {
      repo: 'TwitchSentry',
      name: 'TwitchSentry',
      section: 'tools',
      featured: true,
      logo: 'assets/img/projects/twitchsentry.png',
      screenshot: 'assets/img/twitchsentry-app.jpg',
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
      version: 'v4.0.1', stars: 4, downloads: 93,
    },
    {
      repo: 'Better-Stream-Announcements',
      name: 'Better Stream Announcements',
      section: 'tools',
      logo: 'assets/img/projects/better-stream-announcements.png',
      tagline: 'Go-live and stream-ended embeds in Discord, for your own channel and your streamer friends. Slash commands and a settings window included.',
      platforms: ['Twitch', 'YouTube', 'Kick', 'Owncast', 'Rumble', 'Picarto', 'TikTok'],
      tags: ['Discord'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v2.0.0', stars: 1, downloads: 43,
    },
    {
      repo: 'SBRefFix',
      name: 'SBRefFix',
      section: 'tools',
      mono: '.sb',
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
      name: 'Blackjack Game',
      section: 'games',
      logo: 'assets/img/projects/blackjack-game.png',
      tagline: 'A real hand of Blackjack against the dealer, with splits, double downs and insurance. Or challenge another chatter with !duel.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v16.1.1', stars: 2, downloads: 147,
    },
    {
      repo: 'Classic-Chat-Gamble',
      name: 'Classic Chat Gamble',
      section: 'games',
      logo: 'assets/img/projects/classic-chat-gamble.png',
      tagline: 'The most classic chat game. Bet with numbers, keywords or percentages, chase jackpots, or run it on Twitch channel points.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v24.1.0', stars: 1, downloads: 124,
    },
    {
      repo: 'Trivia-Game',
      name: 'Trivia Game',
      section: 'games',
      logo: 'assets/img/projects/trivia-game.png',
      tagline: 'Quiz rounds straight in chat. Questions from the Open Trivia Database, your own list or both, with blitz rounds and viewer suggestions.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v8.0.0', stars: 1, downloads: 64,
    },
    {
      repo: 'Slot-Machine-Game',
      name: 'Slot Machine Game',
      section: 'games',
      logo: 'assets/img/projects/slot-machine-game.png',
      tagline: 'Chat spins the reels with emotes. Adjustable odds, three to six reels, rare emotes pay more, and an optional jackpot pool.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v15.0.0', stars: 2, downloads: 47,
    },
    {
      repo: 'Hangman-Game',
      name: 'Hangman Game',
      section: 'games',
      logo: 'assets/img/projects/hangman-game.png',
      tagline: 'One word, a row of blanks and everyone guessing at once. The OBS overlay draws the gallows as chat guesses.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v11.0.0', stars: 2, downloads: 16,
    },
    {
      repo: 'Battleship-Game',
      name: 'Battleship Game',
      section: 'games',
      logo: 'assets/img/projects/battleship-game.png',
      tagline: 'Chat commands a fleet against the Admiral, a CPU opponent that never sees your board, on a grid drawn live in OBS.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 1, downloads: 0,
    },
  ],
};
