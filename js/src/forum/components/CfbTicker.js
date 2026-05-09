import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * CfbTicker — ESPN College Football live score ticker for Flarum 2.
 *
 * Rendered as a fixed horizontal strip. Scores auto-scroll and auto-refresh.
 * Each game chip shows:
 *   [Rank] AWAY abbr  Score  HOME abbr [Rank]  | Quarter / Status | TV network
 */
export default class CfbTicker extends Component {
    oninit(vnode) {
        super.oninit(vnode);

        this.games          = [];
        this.loading        = true;
        this.error          = null;
        this.scrollPos      = 0;
        this.animFrame      = null;
        this.refreshTimer   = null;
        this.paused         = false;
        this.expanded       = false;

        this.speed          = parseInt(app.forum.attribute('espnCfbTicker.speed')          || 40);
        this.refreshInterval = parseInt(app.forum.attribute('espnCfbTicker.refreshInterval') || 60) * 1000;
        this.showLogos      = app.forum.attribute('espnCfbTicker.showLogos') !== false;

        this.fetchScores();
    }

    oncreate(vnode) {
        super.oncreate(vnode);
        this.startScroll();
        this.refreshTimer = setInterval(() => this.fetchScores(), this.refreshInterval);
    }

    onremove(vnode) {
        super.onremove(vnode);
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        if (this.refreshTimer) clearInterval(this.refreshTimer);
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    fetchScores() {
        app.request({
            method: 'GET',
            url: app.forum.attribute('apiUrl') + '/espn-cfb-ticker',
        }).then((data) => {
            this.games   = data.games || [];
            this.loading = false;
            this.error   = null;
            m.redraw();
        }).catch((err) => {
            this.loading = false;
            this.error   = 'Unable to load scores.';
            m.redraw();
        });
    }

    // ── Scroll animation ──────────────────────────────────────────────────────

    startScroll() {
        const ticker   = this.element?.querySelector('.cfb-ticker__track');
        if (!ticker) {
            this.animFrame = requestAnimationFrame(() => this.startScroll());
            return;
        }

        let last = null;
        const step = (ts) => {
            if (!this.paused) {
                if (last !== null) {
                    const delta = ts - last;
                    this.scrollPos += (this.speed * delta) / 1000; // px per second
                    const half = ticker.scrollWidth / 2;
                    if (this.scrollPos >= half) this.scrollPos -= half;
                    ticker.style.transform = `translateX(-${this.scrollPos}px)`;
                }
                last = ts;
            } else {
                last = null;
            }
            this.animFrame = requestAnimationFrame(step);
        };
        this.animFrame = requestAnimationFrame(step);
    }

    // ── Render ────────────────────────────────────────────────────────────────

    view() {
        if (this.loading && this.games.length === 0) {
            return m('div.cfb-ticker', m('div.cfb-ticker__loading', [
                m('span.cfb-ticker__logo-label', '🏈'),
                ' Loading CFB scores…',
            ]));
        }

        if (this.error && this.games.length === 0) {
            return m('div.cfb-ticker', m('div.cfb-ticker__error', this.error));
        }

        if (this.games.length === 0) {
            return m('div.cfb-ticker', m('div.cfb-ticker__empty',
                m('span', '🏈 No college football games scheduled right now.')
            ));
        }

        // Duplicate items for seamless infinite scroll
        const items = [...this.games, ...this.games];

        return m('div.cfb-ticker', {
            onmouseenter: () => { this.paused = true; },
            onmouseleave: () => { this.paused = false; },
        }, [
            // Left brand badge
            m('div.cfb-ticker__brand', [
                m('span.cfb-ticker__brand-icon', '🏈'),
                m('span.cfb-ticker__brand-text', 'CFB'),
            ]),

            // Scrolling track wrapper
            m('div.cfb-ticker__viewport', [
                m('div.cfb-ticker__track',
                    items.map((game, i) => this.renderGame(game, i))
                ),
            ]),

            // Right controls
            m('div.cfb-ticker__controls', [
                m('button.cfb-ticker__btn', {
                    title: this.paused ? 'Play' : 'Pause',
                    onclick: () => { this.paused = !this.paused; },
                }, this.paused ? '▶' : '⏸'),
                m('button.cfb-ticker__btn', {
                    title: 'Refresh scores',
                    onclick: () => { this.fetchScores(); },
                }, '↺'),
            ]),
        ]);
    }

    renderGame(game, key) {
        const { home, away, status, tv, notes } = game;
        const isLive      = status.state === 'in';
        const isPost      = status.state === 'post';
        const isPre       = status.state === 'pre';

        const homeWin = isPost && home.winner;
        const awayWin = isPost && away.winner;

        return m('div.cfb-ticker__game', { key }, [
            // Away team
            this.renderTeam(away, awayWin, isPost),

            // Score / status block
            m('div.cfb-ticker__score-block', [
                isPre
                    ? m('span.cfb-ticker__time', this.formatGameTime(game.date))
                    : m('span.cfb-ticker__score', [
                        m('span', { class: awayWin ? 'cfb-ticker__score-num--winner' : '' }, away.score || '0'),
                        m('span.cfb-ticker__score-sep', '–'),
                        m('span', { class: homeWin ? 'cfb-ticker__score-num--winner' : '' }, home.score || '0'),
                    ]),
                isLive
                    ? m('span.cfb-ticker__status.cfb-ticker__status--live', [
                        m('span.cfb-ticker__live-dot'),
                        status.detail || status.description,
                    ])
                    : m('span.cfb-ticker__status', {
                        class: isPost ? 'cfb-ticker__status--final' : '',
                    }, isPost ? 'FINAL' : (status.detail || '')),
                tv ? m('span.cfb-ticker__tv', tv) : null,
            ]),

            // Home team
            this.renderTeam(home, homeWin, isPost),

            // Separator
            m('span.cfb-ticker__sep', '|'),
        ]);
    }

    renderTeam(team, isWinner, isPost) {
        return m('div.cfb-ticker__team', {
            class: isWinner ? 'cfb-ticker__team--winner' : (isPost ? 'cfb-ticker__team--loser' : ''),
        }, [
            team.rank ? m('span.cfb-ticker__rank', `#${team.rank}`) : null,
            this.showLogos && team.logo
                ? m('img.cfb-ticker__logo', {
                    src: team.logo,
                    alt: team.abbreviation,
                    title: team.display_name,
                    onerror(e) { e.target.style.display = 'none'; },
                })
                : null,
            m('span.cfb-ticker__abbr', team.abbreviation),
        ]);
    }

    formatGameTime(dateStr) {
        if (!dateStr) return 'TBD';
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
        } catch {
            return 'TBD';
        }
    }
}
