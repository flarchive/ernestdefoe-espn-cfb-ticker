# ESPN Scores Ticker — Flarum 2 Extension

[![Floxum](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker/badge/name)](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker)
[![Version](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker/badge/highest-version)](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker)
[![Downloads](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker/badge/downloads)](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker)
[![Review](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker/badge/review)](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker)
[![License](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker/badge/license)](https://floxum.com/extension/ernestdefoe/espn-cfb-ticker)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Flarum](https://img.shields.io/badge/Flarum-2.x-blue)](https://flarum.org)

A live ESPN scores ticker for [Flarum 2](https://flarum.org) forums, powered by the free public ESPN API. Scores scroll automatically across a sticky banner at the top (or bottom) of your forum, updating on a configurable interval.

It shows **FBS college football** out of the box. Pick any mix of these in the settings:

- College football (FBS), NFL
- Men's and women's college basketball (Division I), NBA, WNBA
- MLB, NHL
- UFC and PFL (every bout on the current or next card, winners marked)

With more than one league, each league's games are tagged with its name. The package is still called `espn-cfb-ticker` so existing installs keep updating.

---

## Features

- 🏈 **Ten leagues** — college football, NFL, college basketball, NBA, WNBA, MLB, NHL, UFC and PFL, one or several at once
- 🗓️ **No stale finals** — an off-season league drops its last game after a week instead of showing it all winter
- 📡 **Live scores** with a pulsing green dot for in-progress games
- 🏆 **Rankings** — shows `#N` next to ranked college teams (Top 25)
- 🖼️ **Team logos** pulled directly from ESPN's CDN
- ⚙️ **Admin settings** — toggle on/off, top/bottom position, refresh interval, scroll speed
- 📱 **Responsive** — logos hidden on narrow screens to keep ticker readable
- 🔁 **Seamless loop** — CSS-only marquee with no layout jank
- ♻️ **Auto-refresh** — polls ESPN API on a configurable interval (default 60s)

---

## Requirements

- **Flarum** `^2.0`
- **PHP** `^8.3`
- No external PHP dependencies

---

## Installation

```bash
composer require ernestdefoe/espn-cfb-ticker
```

Then enable the extension in your Flarum admin panel under **Extensions**.

---

## Building JavaScript

If you're contributing or modifying the extension:

```bash
cd js
npm install
npm run build   # production build
npm run dev     # watch mode
```

---

## Admin Settings

| Setting | Default | Description |
|---|---|---|
| Enable Ticker | `true` | Show/hide the ticker sitewide |
| Leagues | College football | Which scoreboards to show; tick several to mix them |
| Position | `top` | Sticky top or fixed bottom |
| Refresh Interval | `60` seconds | How often to poll ESPN API (min 15s) |
| Scroll Speed | `40` | Per-game animation multiplier (lower = faster) |

---

## How It Works

1. On page load the extension mounts a Mithril component outside Flarum's main app node.
2. The component fetches `/api/espn-cfb-ticker/scoreboard` from your forum. The forum asks ESPN's public scoreboard for each chosen league (for example `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=50`, no key required), all at once rather than one after another, keeps each answer in Flarum's cache for 45 seconds so every visitor shares one call per league, and serves the last good copy of a league if ESPN is down.
3. Games are rendered in a CSS `@keyframes` scroll animation. The track is duplicated so the loop is seamless.
4. A `setInterval` re-fetches on the configured interval, causing a Mithril redraw.

---

## ESPN API Notes

The ESPN public scoreboard API (`site.api.espn.com`) is unofficial and undocumented but has been widely used by developers for years. It requires no API key and returns JSON. `groups=80` restricts college football to FBS schools and `groups=50` college basketball to Division I; without them ESPN answers with a featured subset only.

---

## Support

- **Support forum:** [ESPN Scores Ticker on ernestdefoe.online](https://ernestdefoe.online/d/4)
- **Bug reports:** [GitHub issues](https://github.com/ernestdefoe/espn-cfb-ticker/issues)

## License

[MIT](LICENSE) © 2026 ernestdefoe
