<!--
  The common problems on the help page (help/index.html), written into it by _tools/update-pages.js.
  One "## " heading per problem: what people see, in their words. An optional line "For: …" right
  under it says which projects it is about. The rest is the fix, in Markdown; links are relative to
  the help page (../projects/obsnotes/ is a project page). The search finds every heading.
-->

## A command gets no answer in chat
For: every project with chat commands

- **Switched off.** Every project's commands are imported switched off. In Streamer.bot, open the **Commands** tab, right-click the project's group and click **Enable All**. Step 3 of [Get started](../#start) shows it.
- **Not for everyone.** Some commands are for moderators or VIPs only. The [commands page](../commands/) says who may use each one.
- **Platform left out.** A platform unticked in the command's **Sources** gets no answer there, and Streamer.bot has to be connected to that platform's chat.
- **Cooldown.** Many commands wait a few seconds before they answer the same viewer again.

## Errors about missing references after an import
For: anything exported from Streamer.bot 1.0.7, from anyone

Streamer.bot shows compile errors like *The type or namespace name … could not be found* or *are you missing an assembly reference?*, and **Find Refs** does not make them go away.

An export from Streamer.bot 1.0.7 stores its .NET references relative to the folder Streamer.bot was in on the PC that made it. Where Streamer.bot sits somewhere else, those references point at nothing. [SBRefFix](../projects/sbreffix/) rewrites them so they hold on every PC: run it on the `.sb` file or the import string before you import it, or ask whoever shared it to. If it happens with one of the projects here, please report it on the project's GitHub page.

## The OBS overlay stays empty
For: Blackjack, Battleship, Hangman, Trivia, RhymeTime, OBS Notes

- **The right file.** The browser source has to show the overlay file the project's setup guide names, from the folder its settings window shows.
- **Nothing to show yet.** Most game overlays only draw while a game is running and are invisible in between.
- **The connection.** Depending on the project, Streamer.bot reaches the overlay through its connection to OBS or through its own WebSocket server. The setup guide says which; check in Streamer.bot that it is connected or started.
- **After an update.** OBS keeps the page it loaded. Right-click the browser source, **Properties**, **Refresh cache of current page**.

The FAQ of each game has an *OBS Overlay* part with more.

## Viewers don't win or lose points
For: the chat games

- **The points variable.** The games pay out into the variable your points system uses. Its name in the game's settings has to match exactly.
- **Free mode.** With a free mode on, nobody pays or wins; the settings window says when it is on.
- **Channel points.** Where a game takes Twitch channel points, some modes take no points on a loss by design.

The *Points* part of the game's FAQ lists its own settings: [Blackjack](../projects/blackjack-game/?tab=faq), [Classic Chat Gamble](../projects/classic-chat-gamble/?tab=faq), [Slot Machine](../projects/slot-machine-game/?tab=faq), [Trivia](../projects/trivia-game/?tab=faq), [Hangman](../projects/hangman-game/?tab=faq), [Battleship](../projects/battleship-game/?tab=faq), [RhymeTime](../projects/rhymetime/?tab=faq).

## Where are the settings?
For: every project with a settings window

Each project has an action that opens its settings window. In Streamer.bot, open **Actions**, find the project's group and its settings action, right-click its trigger and click **Test Trigger**. Step 3 of [Get started](../#start) shows it. The settings themselves are files in your Streamer.bot folder, so you can back them up with it.

## How do I know a new version is out, and how do I update?

- **The settings window tells you.** Most projects ask GitHub for the latest release whenever their settings window opens and show an **Update** notice in it.
- **The release feed.** The [release feed](../feed.xml) lists every new version of every project, for any feed reader.
- **Updating.** Download the new release and import it like the first time, over the old one. The settings are files of their own and stay. The project's changelog says when a version needs more than that.

## Kick or YouTube chat gets no answer
For: projects that work on more than Twitch

Streamer.bot has to be connected to that platform, and the platform has to be ticked in the command's **Sources**. Some features are Twitch only, for example `/me` messages; each project's page shows which platforms it works with.

## Posts to Discord, Stoat or GameVox don't arrive
For: Suggestions To, Better Stream Announcements, TwitchSentry

- **The whole webhook URL.** Copy it again from the channel's webhook settings; a URL cut short, or a webhook that was deleted, gets nothing through.
- **The right setting.** Each service has its own setting for its webhook. The project's setup guide names them.
- **The log.** Streamer.bot's log says what the service answered, which usually names the problem.
