# ESPN CFB Ticker — Flarum 2 Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Flarum](https://img.shields.io/badge/Flarum-2.x-blue)](https://flarum.org)

A live **FBS college football** scores ticker for [Flarum 2](https://flarum.org) forums, powered by the free public ESPN API. Scores scroll automatically across a sticky banner at the top (or bottom) of your forum, updating on a configurable interval.

---

## Features

- 🏈 **FBS-only** — filters ESPN's API to Group 80 (NCAA Division I FBS)
- 📡 **Live scores** with a pulsing green dot for in-progress games
- 🏆 **AP/Coaches rankings** — shows `#N` next to ranked teams (Top 25)
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
| Position | `top` | Sticky top or fixed bottom |
| Refresh Interval | `60` seconds | How often to poll ESPN API (min 15s) |
| Scroll Speed | `40` | Per-game animation multiplier (lower = faster) |

---

## How It Works

1. On page load the extension mounts a Mithril component outside Flarum's main app node.
2. The component `fetch()`es `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=50` — the public ESPN API, no key required.
3. Games are rendered in a CSS `@keyframes` scroll animation. The track is duplicated so the loop is seamless.
4. A `setInterval` re-fetches on the configured interval, causing a Mithril redraw.

---

## ESPN API Notes

The ESPN public scoreboard API (`site.api.espn.com`) is unofficial and undocumented but has been widely used by developers for years. It requires no API key and returns JSON. The `groups=80` parameter restricts results to FBS schools.

---

## License

[MIT](LICENSE) © 2026 ernestdefoe
