# ESPN College Football Ticker — Flarum 2 Extension

A live-scrolling ESPN college football score ticker for [Flarum 2](https://flarum.org). Displays real-time scores, game status, team logos, rankings, and TV network info fetched directly from the public ESPN API — no API key required.

---

## Features

- **Live scores** — auto-refreshes every 60 seconds (configurable)
- **Smooth horizontal scroll** — infinite loop, pause on hover
- **Team logos** — pulled from ESPN CDN
- **AP rankings** — shows #1–#25 beside ranked teams
- **Status indicators** — Pre-game time, live quarter/clock (pulsing dot), Final
- **TV network** — e.g. ESPN, ABC, FOX, CBS, SEC Network
- **Admin settings** — enable/disable, position (top/bottom), scroll speed, refresh interval, logos on/off
- **No API key needed** — uses the public ESPN v2 scoreboard endpoint

---

## Requirements

| Requirement | Version |
|-------------|---------|
| PHP         | ^8.1    |
| Flarum      | ^2.0    |
| Node.js     | ^18.0 (for building JS) |

---

## Installation

### Via Composer (recommended)

```bash
composer require ernestdefoe/espn-cfb-ticker
php flarum cache:clear
```

### Manual Installation

1. Clone or download this repository into `extensions/ernestdefoe-espn-cfb-ticker/`
2. Run `composer install` inside the extension directory
3. Build the JS assets:
   ```bash
   cd extensions/yourvendor-espn-cfb-ticker
   npm install
   npm run build
   ```
4. Enable in Flarum Admin → Extensions

---

## Building JS Assets

```bash
# Install dependencies
npm install

# Development (with watch)
npm run dev

# Production build
npm run build
```

Built files output to `js/dist/forum.js` and `js/dist/admin.js`.

---

## Configuration

All settings are available in **Admin → Extensions → ESPN CFB Ticker**:

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Ticker | ✅ | Show/hide the ticker globally |
| Position | Top | Fixed to top or bottom of viewport |
| Scroll Speed | 40 px/s | Horizontal scroll speed (5–200) |
| Refresh Interval | 60 s | How often to re-fetch scores (min 15s) |
| Show Team Logos | ✅ | Display ESPN-hosted team logos |

---

## API Details

The extension proxies requests through your Flarum server to:

```
https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard
```

This is a **public, unauthenticated** ESPN API endpoint. Parameters:
- `groups=80` — FBS (top-division college football)
- `limit=100` — fetch up to 100 games per week
- Season and week are auto-detected by ESPN

---

## File Structure

```
espn-cfb-ticker/
├── composer.json               # Flarum extension metadata
├── extend.php                  # Extension bootstrap (routes, settings, assets)
├── webpack.config.js           # JS build config
├── package.json
├── locale/
│   └── en.yml                  # English translations
├── less/
│   ├── forum.less              # Ticker bar styles
│   └── admin.less              # Admin panel styles
├── js/
│   ├── dist/                   # Built output (after npm run build)
│   │   ├── forum.js
│   │   └── admin.js
│   └── src/
│       ├── forum/
│       │   ├── index.js        # Forum entry point; mounts ticker
│       │   └── components/
│       │       └── CfbTicker.js  # Mithril component (ticker UI)
│       └── admin/
│           └── index.js        # Admin settings registration
└── src/
    └── Api/
        └── Controller/
            └── GetScoresController.php  # PHP proxy to ESPN API
```

---

## Customization

### Change the default conference/group

Edit `GetScoresController.php` — the `groups` query param controls which games appear:

| Value | Group |
|-------|-------|
| `80`  | FBS (default — top tier) |
| `81`  | FCS |
| `5`   | Top 25 matchups |

### Modify ticker colors

Edit `less/forum.less` — all colors are LESS variables at the top of the file:

```less
@ticker-bg:       #0a0a0a;   // Bar background
@ticker-brand-bg: #CC0000;   // Red ESPN-style badge
@ticker-live:     #22c55e;   // Live game green pulse
@ticker-rank:     #ffdd00;   // AP ranking gold
```

---

## Troubleshooting

**Ticker shows "Unable to load scores"**
- Check your server can reach `site.api.espn.com` (outbound HTTPS)
- Check `php flarum` logs for API errors

**JS not loading**
- Run `npm run build` and ensure `js/dist/forum.js` exists
- Run `php flarum cache:clear`

**Ticker not visible**
- Confirm the extension is enabled in Admin
- Check browser console for JS errors

---

## License

MIT © Your Name / Your Vendor

---

## Credits

- Score data provided by the [ESPN public API](https://site.api.espn.com)
- Built for [Flarum 2](https://flarum.org) using Mithril.js
