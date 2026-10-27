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
 *   status     shown next to the version: 'dev' (yellow "In development"), 'complete' (green
 *              "Feature Complete": all planned features are in) or 'done' (pink "Done": finished)
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
      tagline: 'TwitchSentry is a fully automated moderation suite designed for quiet and crowded chats. TwitchSentry is capable to replace a human moderator in small communities and works great as backup in big communities.',
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
      page: 'better-stream-announcements/',
      status: 'dev',
      name: 'Better Stream Announcements',
      section: 'tools',
      logo: 'assets/img/projects/better-stream-announcements.png',
      scene: 'assets/img/scenes/better-stream-announcements.jpg',
      sceneAlt: 'A go-live announcement in Discord with the stream title, game, viewers, a preview image and a Watch Stream button.',
      tagline: 'Automatically announce your and your friend\'s livestream on Discord, Stoat, GameVox.',
      platforms: ['Twitch', 'YouTube', 'Kick', 'Owncast', 'Rumble', 'Picarto', 'TikTok'],
      tags: ['Discord', 'Stoat', 'GameVox'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v2.0.0', stars: 1, downloads: 43,
    },
    {
      repo: 'SBRefFix',
      page: 'sbreffix/',
      status: 'done',
      name: 'SBRefFix',
      // a helper for anyone sharing Streamer.bot exports, not a stream tool
      section: 'more',
      mono: '.sb',
      scene: 'assets/img/scenes/sbreffix.jpg',
      sceneAlt: 'SBRefFix in a console window, rewriting the .NET references of a Streamer.bot export.',
      tagline: 'Fixes the broken .NET references in a Streamer.bot v1.0.7 export.',
      platforms: ['Windows'],
      tags: ['PowerShell'],
      download: 'https://github.com/aaskjer/SBRefFix/archive/refs/heads/main.zip',
      downloadLabel: 'Download ZIP',
      guide: { label: 'How to use', href: 'https://github.com/aaskjer/SBRefFix#how-to-use-it' },
      version: null, stars: 0, downloads: 0,
    },
    {
      repo: 'SuTo',
      page: 'suto/',
      status: 'complete',
      name: 'Suggestions To',
      section: 'tools',
      mono: 'SuTo',
      scene: 'assets/img/scenes/suto.jpg',
      sceneAlt: 'Viewers type !suggestion in Twitch, YouTube and Kick chat, and each suggestion lands in a Discord channel with the viewer\'s name, platform and time.',
      tagline: 'Your chat has good ideas but you always struggle to remember them? Now your chat can write them down for you!',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['Discord', 'Stoat', 'GameVox'],
      guide: { label: 'Manual', href: 'Manual.md' },
      version: 'v1.0.0', stars: 0, downloads: 0,
    },
    {
      repo: 'OBSNotes',
      page: 'obsnotes/',
      status: 'complete',
      name: 'OBS Notes',
      section: 'tools',
      logo: 'assets/img/projects/obsnotes.png',
      scene: 'assets/img/scenes/obsnotes.jpg',
      sceneAlt: 'Viewers write their Fran Bow clues into chat with !note, and each one sticks on stream as a post-it.',
      tagline: 'Can\'t remember the code of the combination lock? Your chat can step-in an add a post-it in OBS for you!',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup', href: 'https://github.com/aaskjer/OBSNotes#-setup' },
      version: 'v1.0.0', stars: 0, downloads: 0,
    },
    {
      repo: 'ChatCalendar',
      page: 'chatcalendar/',
      status: 'complete',
      name: 'Chat Calendar',
      section: 'tools',
      logo: 'assets/img/projects/chatcalendar.png',
      scene: 'assets/img/scenes/chatcalendar.jpg',
      sceneAlt: 'Chat on Christmas Day: the bot wishes every viewer a happy holiday, saves a birthday and lists the next holidays and birthdays.',
      tagline: 'Create your own calendar that display holidays, birthdays or other custom special days in your chat!',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['Discord', 'Stoat', 'GameVox'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 0, downloads: 0,
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
      tagline: 'You don\'t need to go to Las Vegas to play solid Strip Poker! Play against the CPU, another Player or together against the House!',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v16.1.1', stars: 2, downloads: 147,
    },
    {
      repo: 'Classic-Chat-Gamble',
      page: 'classic-chat-gamble/',
      status: 'done',
      name: 'Classic Chat Gamble',
      section: 'games',
      logo: 'assets/img/projects/classic-chat-gamble.png',
      scene: 'assets/img/scenes/classic-chat-gamble.jpg',
      sceneAlt: 'Viewers gambling in chat with !gamble, and the game answering with wins, losses and a jackpot.',
      tagline: 'The most classic stream chat game ever! Highly customizable and always up to zero your balance!',
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
      tagline: 'Ready to put your knowledge to the test? Let\'s see how you work under pressure!',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v8.0.0', stars: 1, downloads: 64,
    },
    {
      repo: 'Slot-Machine-Game',
      page: 'slot-machine-game/',
      status: 'done',
      name: 'Slot Machine Game',
      section: 'games',
      logo: 'assets/img/projects/slot-machine-game.png',
      scene: 'assets/img/scenes/slot-machine-game.jpg',
      sceneAlt: 'Slot spins in chat: the reels, then the win, loss or jackpot message.',
      tagline: 'Who needs a casino if you can play your slots right here in the chat? Spin the wheels and reach for the Jackpool!',
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
      tagline: 'One of the most iconic Pencil&Paper games. But the future is now, we play in OBS not on paper!',
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
      tagline: 'One of the iconic Pencil&Paper games now also available in chat and OBS overlay with heat click support!',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      version: 'v1.0.0', stars: 1, downloads: 0,
    },
  ],
};
