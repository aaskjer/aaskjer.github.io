/*
 * The projects shown on the site.
 *
 * Add, remove or reorder entries here. Stars, downloads, versions and the
 * "updated" date are refreshed live from the GitHub API when the page loads;
 * the numbers below are only the fallback for when that request fails.
 * _tools/update-pages.js keeps the line "version: …, stars: …, downloads: …,"
 * of every project with a page current, so leave it on one line.
 * Public repositories that are not listed here appear on their own under
 * "More on GitHub".
 *
 *   repo       repository name on GitHub (required)
 *   streamerbot  the oldest Streamer.bot the project runs in, e.g. '1.0.7': in anything older its C# code
 *              does not compile. Shown in "What you need" on its page and in the table on the help page,
 *              instead of the minimum version in the import string (Streamer.bot writes a low one there).
 *              `false` for a tool that runs outside Streamer.bot
 *   needs      what the project needs besides Streamer.bot, the platforms and the services it sends to,
 *              e.g. an API key: [{ name, what }], as rows of "What you need" on its page
 *   tagline    only a fallback: the site shows the short description from the repository's
 *              About box on GitHub (projects under "More on GitHub" too)
 *   section    'tools', 'games' or 'more' (under "More on GitHub", before the repositories GitHub adds)
 *   features   list of highlights, shown on the project's page and, without a `spotlight`, in the Featured box
 *   spotlight  the project's own card in the Featured box (see `featured` below), so no two look alike:
 *              { accent, flip, blocks, aside }. `accent` colours its details, `flip: true` puts the
 *              picture on the left, `blocks` follow the description and `aside` sits under the picture.
 *              A block is one of { features } (ticks, `true` for the project's `features`), { notes }
 *              (the same as post-its), { facts: [[value, label]] }, { commands }, { flow: [[step, detail]] },
 *              { list } (`mono: true` for code), { letters } ('_' a blank, `mark` the last letters that
 *              stand out, `text` for screen readers), { logos } (repositories of this list) or
 *              { code: { before, after } }, each with an optional `label`. A small card in the Featured
 *              box shows one of them too: the first `facts`, else `commands`, `list`, `flow`, `code`,
 *              `letters` or `logos` (cardBlock in main.js)
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
 *   status     shown next to the version: 'dev' (yellow "In development") or 'done' (finished
 *              apart from fixes: no label,
 *              the pink "Done" badge is switched off in main.js and project.js)
 *   playground  for a game with its rules in assets/js/playground/<page folder>.js: { overlay } is
 *              the C# string in its import string that holds its OBS overlay. Its page gets a
 *              "Try it" tab with a chat and that overlay; _tools/update-pages.js copies it out (playground.html).
 *              `{}` for a game without an overlay: the tab has the chat alone
 *   statusSince  the day `status` last changed, e.g. '2026-10-28'; set it with every change, it
 *              puts the project in the Featured box for a while
 */
window.SITE = {
  user: 'aaskjer',
  twitch: 'https://www.twitch.tv/aaskjer',
  // Umami Cloud visitor statistics: the website ID from the Umami dashboard; leave empty to switch them off
  stats: { script: 'https://cloud.umami.is/script.js', websiteId: '1fd3cb1c-351d-4e3c-aed9-925125642e95', domain: 'aaskjer.github.io' },
  // A repository without a release that holds only README and LICENSE shows a "Coming Soon" label
  // instead of its buttons. Repositories listed here show it too although they already have
  // files, until their first release is out.
  comingSoon: [],
  // The Featured box above the stream tools. A project gets in for `days` after a release (a
  // pre-release too) or a change of its status, and for at least `downloads.min` downloads in the
  // last `downloads.days` days. The newest reason gets the big box, up to `max` - 1 more sit below
  // it as cards (with the first sentence of their release notes after a release), and `fallback` is
  // shown while no project has a reason. The download history is the stats branch of this
  // repository, recorded once a day by .github/workflows/download-counts.yml.
  featured: { fallback: 'TwitchSentry', days: 7, max: 3, downloads: { days: 7, min: 20 } },
  projects: [
    {
      repo: 'TwitchSentry',
      streamerbot: '1.0.7',
      page: 'projects/twitchsentry/',
      status: 'dev',
      name: 'TwitchSentry',
      section: 'tools',
      logo: 'assets/img/projects/twitchsentry.png',
      scene: 'assets/img/scenes/twitchsentry.jpg',
      sceneAlt: 'TwitchSentry removes a viewer-selling spam message and an unauthorized link from chat, then a moderator gives a link permit.',
      tagline: 'TwitchSentry is a fully automated moderation suite designed for quiet and crowded chats. It can replace a human moderator in small communities and works great as a backup in big ones.',
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
      spotlight: {
        accent: '#9146ff',
        blocks: [{ features: true }],
        aside: [{ label: 'A few of its chat commands', commands: ['!Permit', '!CheckLink', '!Vote', '!AntiRaid', '!nuke'] }],
      },
      version: 'v4.0.1', stars: 7, downloads: 136,
    },
    {
      repo: 'Better-Stream-Announcements',
      streamerbot: '1.0.7',
      page: 'projects/better-stream-announcements/',
      status: 'done',
      statusSince: '2026-11-15',
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
      spotlight: {
        accent: '#5865f2',
        flip: true,
        blocks: [
          { facts: [['7', 'streaming platforms'], ['3', 'places to post'], ['3', 'slash commands']] },
          { features: [
            'Go-live and stream-ended posts for you and your streamer friends',
            'Game, viewers, box art, a preview and a Watch button in the embed',
            '@everyone, @here or role pings, crossposting and cooldowns',
            'Members sign themselves up for announcements and roles',
          ] },
        ],
        aside: [{ label: 'Slash commands in Discord', commands: ['/bsa setup', '/streamerfriends', '/crosspost'] }],
      },
      version: 'v2.1.1', stars: 1, downloads: 73,
    },
    {
      repo: 'SBRefFix',
      streamerbot: false,
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
      spotlight: {
        accent: '#5391fe',
        blocks: [
          { label: 'One reference, exported from a Streamer.bot on the desktop', code: {
            before: '..\\..\\..\\..\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\System.dll',
            after: '%SystemRoot%\\Microsoft.NET\\Framework64\\v4.0.30319\\System.dll',
          } },
          { features: [
            'Takes .sb files, import strings and the clipboard',
            'Rewrites only the paths tied to the exporting PC',
            'Everything else in the export stays byte for byte',
            'Writes nothing unless every check passes',
          ] },
        ],
      },
      version: 'v1.0.0', stars: 1, downloads: 2,
    },
    {
      repo: 'UIFramework-Streamer.bot',
      streamerbot: '1.0.7',
      page: 'projects/uiframework/',
      status: 'dev',
      statusSince: '2026-11-08',
      name: 'UIFramework',
      // the settings window under every chat game; for people who build Streamer.bot extensions
      section: 'more',
      logo: 'assets/img/projects/uiframework.png',
      scene: 'assets/img/scenes/uiframework.jpg',
      sceneAlt: 'The UIFramework logo next to two settings windows: Blackjack\'s table page, and the Demo Game with its first-start tour pointing at a setting.',
      tagline: 'One settings window for every Streamer.bot chat game.',
      description: 'UIFramework gives a Streamer.bot extension a full settings window from one table in its C# code: pages, validation, a chat preview, a log reader, a customise mode, a tour of itself, and updates that install themselves. The window of every chat game on this site.',
      preview: 'One settings window for every Streamer.bot chat game: declared in one table, with a tour, a log reader and self-updates.',
      platforms: ['Windows'],
      tags: ['C#', 'WPF', 'Developers'],
      // the DLL is built for it (WPF)
      needs: [{ name: '.NET Framework 4.8', what: 'part of Windows 10 (version 1903 or later) and Windows 11' }],
      guide: { label: 'Getting started', href: 'docs/Getting-Started.md' },
      moreDocs: [
        { id: 'get-started', label: 'Get started', file: 'docs/Getting-Started.md' },
        { id: 'schema', label: 'Schema', file: 'docs/Schema.md' },
      ],
      spotlight: {
        accent: '#c084fc',
        flip: true,
        blocks: [
          { facts: [['9', 'projects built on it'], ['5', 'languages']] },
          { features: [
            'A whole settings window from one table in your C# code',
            'Search with Ctrl+F, a tour and a customise mode',
            'A log reader, a help page and an about page',
            'Tells about new releases and updates itself',
          ] },
        ],
        aside: [{ label: 'Built on it', logos: ['Blackjack-Game', 'Battleship-Game', 'Slot-Machine-Game', 'Classic-Chat-Gamble', 'Trivia-Game', 'Hangman-Game', 'RhymeTime', 'High-Low-Game', 'GameCheck'] }],
      },
      version: 'v2.0.0', stars: 0, downloads: 133,
    },
    {
      repo: 'SuTo',
      streamerbot: '1.0.4',
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
      spotlight: {
        accent: '#22c55e',
        blocks: [
          { flow: [['!suggestion', 'in Twitch, YouTube or Kick chat'], ['Streamer.bot', 'works out the platform'], ['Your server', 'Discord, Stoat or GameVox']] },
          { features: [
            'An embed with the viewer\'s avatar, name, platform and time',
            'A forum post per suggestion, or all of them in one thread',
            'Several channels at once',
            'Chat hears back only once the post arrived',
          ] },
        ],
      },
      version: 'v1.0.0', stars: 0, downloads: 1,
    },
    {
      repo: 'OBSNotes',
      streamerbot: '1.0.7',
      page: 'projects/obsnotes/',
      status: 'done',
      statusSince: '2026-10-27',
      name: 'OBS Notes',
      section: 'tools',
      logo: 'assets/img/projects/obsnotes.png',
      scene: 'assets/img/scenes/obsnotes.jpg',
      sceneAlt: 'Viewers write their Fran Bow clues into chat with !note, and each one sticks on stream as a post-it.',
      tagline: 'Can\'t remember the code of the combination lock? Your chat can step in and add a post-it in OBS for you!',
      description: 'OBS Notes for Streamer.bot: viewers write codes, quest hints and names into Twitch, YouTube or Kick chat with !note, and each note sticks on stream as a post-it, one list per game.',
      preview: 'Chat writes it down, OBS shows it as a post-it: notes from Twitch, YouTube and Kick chat, one list per game. A free Streamer.bot import.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#facc15',
        flip: true,
        blocks: [
          { notes: [
            'One list per game, from the Twitch or Kick category',
            'Each note grows as big as its post-it allows',
            'The seventh note sticks over the first',
            'A backup file per game keeps every note',
          ] },
          { label: 'In chat', commands: ['!note', '!delnote', '!clearnotes', '!shownotes'] },
        ],
      },
      version: 'v2.0.0', stars: 0, downloads: 17,
    },
    {
      repo: 'GameCheck',
      streamerbot: '1.0.7',
      page: 'projects/gamecheck/',
      status: 'done',
      statusSince: '2026-11-15',
      name: 'GameCheck',
      section: 'tools',
      logo: 'assets/img/projects/gamecheck.png',
      scene: 'assets/img/scenes/gamecheck.jpg',
      sceneAlt: 'A Discord channel with the Free Games and Top Deals messages GameCheck keeps up to date, next to its settings window.',
      tagline: 'Never miss a free game or a big sale again: your Discord always shows what is free and what is cheap right now!',
      description: 'GameCheck for Streamer.bot: free games, DLC, loot and demos from Steam, Epic, GOG, Prime Gaming and more, plus the running store sales and the top deals per store, in Discord messages that keep themselves up to date.',
      preview: 'Free games and the best game deals in your Discord, kept up to date on their own. A free Streamer.bot import.',
      tags: ['Discord'],
      needs: [
        { name: 'Discord bot or webhook', what: 'a bot token and channel ID, or a webhook URL' },
        { name: 'IsThereAnyDeal API key', what: 'optional, adds the giveaways and deals of more shops' },
      ],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#66c0f4',
        blocks: [
          { label: 'Free games and deals from', list: ['Steam', 'Epic Games', 'GOG', 'Nintendo eShop (EU)', 'Prime Gaming', 'IsThereAnyDeal'] },
          { features: [
            'One message per topic, edited in place instead of spammed',
            'A store that fails keeps its last good answer for 24 hours',
            'Works with a Discord bot or just a webhook',
          ] },
        ],
        aside: [{ label: 'Marked in the message', list: ['🆕 New', '🔥 Ends soon', '📉 Lowest price ever', '🚫 Not in your country'] }],
      },
      version: 'v2.1.1', stars: 0, downloads: 10,
    },
    {
      repo: 'ChatCalendar',
      streamerbot: '1.0.7',
      page: 'projects/chatcalendar/',
      status: 'done',
      statusSince: '2026-11-15',
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
      spotlight: {
        accent: '#f87171',
        flip: true,
        blocks: [
          { facts: [['100+', 'countries with their holidays']] },
          { features: [
            'Regions too, such as Texas, Ontario, Bavaria or Queensland',
            'Viewers save their own birthday',
            'Your own days, once or every year',
            'A daily post to Discord, Stoat and GameVox',
          ] },
        ],
        aside: [{ label: 'In chat', commands: ['!birthday 24.12.', '!holidays', '!nextbirthdays'] }],
      },
      version: 'v1.0.1', stars: 0, downloads: 13,
    },
    {
      repo: 'AutoBotCheck',
      streamerbot: '1.0.4',
      page: 'projects/autobotcheck/',
      name: 'AutoBotCheck',
      // a helper for the channel, not a stream tool: during a live stream it gets in the way
      section: 'more',
      mono: 'ABC',
      scene: 'assets/img/scenes/autobotcheck.jpg',
      sceneAlt: 'The Streamer.bot log of an AutoBotCheck run: the bot list is synced, the new bots are banned and the summary counts the bans.',
      tagline: 'Bans the bots from public bot lists in your Twitch channel. Three lists, three actions, and every later run only bans what is new.',
      description: 'AutoBotCheck for Streamer.bot: bans the accounts on the TwitchInsights, TwitchBots.info and ISDS bot lists in your Twitch channel. Later runs only ban the new ones, and mods, VIPs, service bots and your whitelist are never banned.',
      preview: 'Bans the bots from three public bot lists in your Twitch channel, and later runs only the new ones. A free Streamer.bot import.',
      features: [
        'Three bot lists: TwitchInsights, TwitchBots.info and the ISDS ban lists',
        'Only bans what is new, looking accounts up 100 at a time',
        'Never bans the broadcaster, your bot account, mods, VIPs or the whitelist',
        'Leaves Nightbot, StreamElements and other service bots alone',
        'Undoes its own wrong bans and never touches yours',
        'A dry run that only logs what would be banned',
      ],
      platforms: ['Twitch'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#ef4444',
        flip: true,
        blocks: [
          { label: 'Bans the bots on', list: ['TwitchInsights', 'TwitchBots.info', 'the ISDS ban lists'] },
          { features: [
            'Never bans the broadcaster, your bot account, mods, VIPs or the whitelist',
            'Leaves Nightbot, StreamElements and other service bots alone',
            'Only bans what is new, looking accounts up 100 at a time',
            'A dry run that only logs what would be banned',
          ] },
        ],
      },
      version: 'v1.1.0', stars: 0, downloads: 2,
    },
    {
      repo: 'Blackjack-Game',
      streamerbot: '1.0.7',
      page: 'projects/blackjack-game/',
      status: 'dev',
      name: 'Blackjack Game',
      playground: { overlay: 'HtmlTemplate' },
      section: 'games',
      logo: 'assets/img/projects/blackjack-game.png',
      scene: 'assets/img/scenes/blackjack-game.jpg',
      sceneAlt: 'A Blackjack duel on stream: both hands on the OBS overlay while chat plays with hit and stand.',
      tagline: 'You don\'t need to go to Las Vegas to play solid Blackjack! Play against the CPU, another Player or together against the House!',
      description: 'A real hand of Blackjack against the dealer in chat, with splits, double downs and insurance, or a duel between two chatters. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Blackjack against the dealer or another chatter, with an OBS overlay. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#22c55e',
        blocks: [
          { facts: [['3', 'casino rule sets'], ['1–8', 'decks per shoe'], ['171', 'chat lines']] },
          { features: [
            'Hit, stand, double, split, surrender and insurance',
            'Duels: points go straight from one chatter to the other',
            'An OBS overlay with real cards and deal animations',
          ] },
        ],
        aside: [{ label: 'In chat', commands: ['!blackjack', '!bjduel', '!house', '!stats'] }],
      },
      version: 'v17.5.4', stars: 2, downloads: 162,
    },
    {
      repo: 'Classic-Chat-Gamble',
      streamerbot: '1.0.4',
      page: 'projects/classic-chat-gamble/',
      status: 'done',
      statusSince: '2026-10-26',
      name: 'Classic Chat Gamble',
      playground: {},
      section: 'games',
      logo: 'assets/img/projects/classic-chat-gamble.png',
      scene: 'assets/img/scenes/classic-chat-gamble.jpg',
      sceneAlt: 'Viewers gambling in chat with !gamble, and the game answering with wins, losses and a jackpot.',
      tagline: 'The most classic stream chat game ever! Highly customizable and always up to zero your balance!',
      description: 'The classic chat gamble: bet with numbers, keywords or percentages, chase jackpots, or run it on Twitch channel points. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Gamble points in chat with numbers, keywords or percentages and chase jackpots. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#f59e0b',
        flip: true,
        blocks: [
          { label: 'Bets in any form', commands: ['!gamble 500', '!gamble all', '!gamble half', '!gamble 50%', '!gamble 10k', '!gamble random'] },
          { features: [
            'Jackpots with their own chance and multiplier',
            'One Fairness slider sets all the odds',
            'Twitch channel points with four bet modes',
            'Free play, cooldowns and an addicted list',
          ] },
        ],
      },
      version: 'v25.2.3', stars: 1, downloads: 169,
    },
    {
      repo: 'Trivia-Game',
      streamerbot: '1.0.7',
      page: 'projects/trivia-game/',
      status: 'done',
      statusSince: '2026-11-15',
      name: 'Trivia Game',
      playground: {},
      section: 'games',
      logo: 'assets/img/projects/trivia-game.png',
      scene: 'assets/img/scenes/trivia-game.jpg',
      sceneAlt: 'A trivia round in chat: a question with four answers, the answers from chat and the winners.',
      tagline: 'Ready to put your knowledge to the test? Let\'s see how you work under pressure!',
      description: 'Quiz rounds straight in chat, with questions from the Open Trivia Database, your own list or both, plus blitz rounds and viewer suggestions. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Quiz rounds in chat, with blitz rounds and viewer suggestions. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#38bdf8',
        blocks: [
          { label: 'Questions from', list: ['Open Trivia DB', 'Wikidata', 'OdeNet', 'PokéAPI', 'IGDB', 'your own list'] },
          { features: [
            'Easy asks about Japan and Pikachu, hard about Nauru and Garbodor',
            'An overlay that never shows what chat picked',
            'Rounds that start themselves',
            'Blitz rounds and harder questions pay more',
          ] },
        ],
        aside: [{ label: 'In chat', commands: ['!Trivia', '!suggest', '!TStats'] }],
      },
      version: 'v9.3.3', stars: 2, downloads: 119,
    },
    {
      repo: 'Slot-Machine-Game',
      streamerbot: '1.0.4',
      page: 'projects/slot-machine-game/',
      status: 'done',
      statusSince: '2026-10-26',
      name: 'Slot Machine Game',
      playground: {},
      section: 'games',
      logo: 'assets/img/projects/slot-machine-game.png',
      scene: 'assets/img/scenes/slot-machine-game.jpg',
      sceneAlt: 'Slot spins in chat: the reels, then the win, loss or jackpot message.',
      tagline: 'Who needs a casino if you can play your slots right here in the chat? Spin the wheels and reach for the Jackpot!',
      description: 'Chat spins the reels with emotes: adjustable odds, three to six reels, rare emotes pay more, and an optional jackpot pool. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'A slot machine in chat, with emote reels and a jackpot pool. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#e879f9',
        flip: true,
        blocks: [
          { facts: [['3–6', 'reels'], ['4', 'channel point bet modes']] },
          { features: [
            'Rare emotes pay more',
            'The settings window shows the odds you really set',
            'A jackpot pool that lost bets feed',
            'Subscriber and VIP boosts that add up',
          ] },
        ],
        aside: [{ label: 'In chat', commands: ['!spin', '!slots'] }],
      },
      version: 'v16.4.3', stars: 3, downloads: 75,
    },
    {
      repo: 'Hangman-Game',
      streamerbot: '1.0.7',
      page: 'projects/hangman-game/',
      status: 'done',
      statusSince: '2026-11-15',
      name: 'Hangman Game',
      playground: { overlay: 'OverlayHtmlTemplate' },
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
      spotlight: {
        accent: '#a3e635',
        blocks: [
          { letters: ['H', '_', 'N', 'G', 'M', '_', 'N'], text: 'HANGMAN with two letters missing' },
          { features: [
            'Blitz rounds: less time, fewer lives, more points',
            'Evil Hangman swaps the word mid-round',
            'Words from Wikidata, OdeNet, PokéAPI and IGDB',
            'An overlay that draws the gallows as chat guesses',
          ] },
        ],
        aside: [{ label: 'In chat', commands: ['!hangman', '!guess', '!g'] }],
      },
      version: 'v13.3.3', stars: 2, downloads: 45,
    },
    {
      repo: 'Battleship-Game',
      streamerbot: '1.0.7',
      page: 'projects/battleship-game/',
      status: 'dev',
      name: 'Battleship Game',
      playground: { overlay: 'HtmlTemplate' },
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
      spotlight: {
        accent: '#60a5fa',
        flip: true,
        blocks: [
          { facts: [['6×6', 'Blitz'], ['8×8', 'Quick'], ['10×10', 'Classic']] },
          { features: [
            'The Admiral never sees your board',
            'Paid on the spot for every ship you sink',
            'A turn clock with warnings at 30 and 15 seconds',
            'Click to Fire on the overlay, on Twitch',
          ] },
        ],
        aside: [{ label: 'In chat', commands: ['!battleship', '!fire', '!fleet', '!duel'] }],
      },
      version: 'v2.4.2', stars: 1, downloads: 13,
    },
    {
      repo: 'RhymeTime',
      streamerbot: '1.0.7',
      page: 'projects/rhymetime/',
      status: 'dev',
      name: 'RhymeTime',
      playground: { overlay: 'OverlayHtml' },
      section: 'games',
      mono: 'RT',
      scene: 'assets/img/scenes/rhymetime.jpg',
      sceneAlt: 'A RhymeTime round on stream: the OBS overlay shows the word STREAM with its ending marked, while chat answers in Twitch chat and a battle is won with HISTORY.',
      tagline: 'Does your chat have a way with words? One word, a ticking clock, and a rhyme that pays!',
      description: 'A word to rhyme with, a clock and a few attempts: chat stakes points and answers in ordinary chat, rhymes nobody listed count too, and the OBS overlay carries the word, the clock and the rhyme that won it. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Chat races the clock to rhyme for points, solo or in a battle, with an OBS overlay. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      features: [
        'One word, a clock and a few attempts, answered in ordinary chat',
        'Rhymes nobody listed count too, checked against a dictionary',
        'Battles open one word to the whole chat for a bigger prize',
        'An OBS overlay for the word, the clock and the rhyme that won it',
        'Three word banks and all 19 chat lines in one settings window',
      ],
      platforms: ['Twitch', 'YouTube', 'Kick'],
      tags: ['OBS overlay'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#f472b6',
        flip: true,
        blocks: [
          { letters: ['S', 'T', 'R', 'E', 'A', 'M'], mark: 3, text: 'STREAM, rhyming on EAM' },
          { features: true },
        ],
        aside: [{ label: 'In chat', commands: ['!Rhyme', '!RhymeBattle'] }],
      },
      version: 'v2.4.2', stars: 1, downloads: 15,
    },
    {
      repo: 'High-Low-Game',
      streamerbot: '1.0.7',
      page: 'projects/high-low-game/',
      status: 'done',
      statusSince: '2026-11-15',
      name: 'High-Low Game',
      section: 'games',
      mono: 'HL',
      scene: 'assets/img/scenes/high-low-game.jpg',
      sceneAlt: 'A High-Low round on stream: 23 drops to 9, and chat guesses with !high, !low and !equal in Twitch chat.',
      tagline: 'Higher, lower or the same? A quick guessing game for your chat on Twitch, YouTube and Kick.',
      description: 'High-Low for Streamer.bot: chat guesses whether the next number from 1 to 100 is higher, lower or the same, with chat commands or Twitch channel points, and keeps session and all-time scoreboards. A Streamer.bot extension for Twitch, YouTube and Kick.',
      preview: 'Higher, lower or the same: a quick guessing game for chat, with channel points and scoreboards. A free Streamer.bot extension for Twitch, YouTube and Kick.',
      features: [
        'A number from 1 to 100 is always waiting, nothing to set up',
        'A right !high or !low pays, !equal pays double',
        'Twitch channel points with four kinds of stake, and refunds',
        'Session, all-time and personal scoreboards',
        'Free mode, and custom triggers for your own actions',
        'One settings window, in English or German',
      ],
      platforms: ['Twitch', 'YouTube', 'Kick'],
      guide: { label: 'Setup guide', href: 'Setup-Guide.md' },
      spotlight: {
        accent: '#34d399',
        blocks: [
          { facts: [['1–100', 'the next number'], ['2×', 'for a right !equal']] },
          { features: [
            'Twitch channel points with four kinds of stake, and refunds',
            'Session, all-time and personal scoreboards',
            'Free mode, and custom triggers for your own actions',
            'One settings window, in English or German',
          ] },
        ],
        aside: [{ label: 'Higher, lower or the same?', commands: ['!high', '!low', '!equal'] }],
      },
      version: 'v2.3.3', stars: 0, downloads: 12,
    },
  ],
};
