import Component from 'flarum/common/Component';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

const ESPN_API_URL =
    'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=50';

// FBS group ID = 80 (NCAA Division I FBS)

function statusLabel(event) {
    const state = event.status?.type?.state;
    const detail = event.status?.type?.shortDetail || '';
    if (state === 'pre') return detail || 'Upcoming';
    if (state === 'in') return detail || 'LIVE';
    if (state === 'post') return 'Final';
    return detail;
}

function isLive(event) {
    return event.status?.type?.state === 'in';
}

function formatGame(event) {
    const comps = event.competitions?.[0];
    if (!comps) return null;

    const home = comps.competitors?.find(c => c.homeAway === 'home');
    const away = comps.competitors?.find(c => c.homeAway === 'away');
    if (!home || !away) return null;

    return {
        id: event.id,
        live: isLive(event),
        status: statusLabel(event),
        away: {
            abbr: away.team?.abbreviation || away.team?.displayName,
            logo: away.team?.logo,
            score: away.score,
            rank: away.curatedRank?.current,
        },
        home: {
            abbr: home.team?.abbreviation || home.team?.displayName,
            logo: home.team?.logo,
            score: home.score,
            rank: home.curatedRank?.current,
        },
    };
}

export default class CfbTicker extends Component {
    oninit(vnode) {
        super.oninit(vnode);
        this.games = [];
        this.loading = true;
        this.error = null;
        this._interval = null;

        this.refresh = this.refresh.bind(this);
    }

    oncreate(vnode) {
        super.oncreate(vnode);
        this.refresh();
        const interval = parseInt(
            app.forum.attribute('ernestdefoe-espn-cfb-ticker.refreshInterval') || 60,
            10
        ) * 1000;
        this._interval = setInterval(this.refresh, interval);
    }

    onremove(vnode) {
        super.onremove(vnode);
        if (this._interval) clearInterval(this._interval);
    }

    async refresh() {
        try {
            const res = await fetch(ESPN_API_URL);
            if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
            const data = await res.json();
            const events = data.events || [];
            this.games = events.map(formatGame).filter(Boolean);
            this.error = null;
        } catch (e) {
            console.error('[CfbTicker]', e);
            this.error = 'Could not load scores.';
        } finally {
            this.loading = false;
            m.redraw();
        }
    }

    view() {
        const speed = parseInt(
            app.forum.attribute('ernestdefoe-espn-cfb-ticker.scrollSpeed') || 40,
            10
        );
        const position = app.forum.attribute('ernestdefoe-espn-cfb-ticker.position') || 'top';

        return (
            <div className={`CfbTicker CfbTicker--${position}`}>
                <div className="CfbTicker-label">
                    <i className="fas fa-football-ball" />
                    <span>CFB</span>
                </div>

                <div className="CfbTicker-track-wrapper">
                    {this.loading ? (
                        <LoadingIndicator size="small" />
                    ) : this.error ? (
                        <span className="CfbTicker-error">{this.error}</span>
                    ) : this.games.length === 0 ? (
                        <span className="CfbTicker-empty">No FBS games scheduled today.</span>
                    ) : (
                        <div
                            className="CfbTicker-track"
                            style={`animation-duration: ${Math.max(10, this.games.length * speed)}s`}
                        >
                            {/* Duplicate for seamless loop */}
                            {[...this.games, ...this.games].map((g, i) => (
                                <span key={`${g.id}-${i}`} className={`CfbTicker-game${g.live ? ' CfbTicker-game--live' : ''}`}>
                                    {g.live && <span className="CfbTicker-live-dot" title="Live" />}

                                    {/* Away team */}
                                    {g.away.rank && g.away.rank <= 25 && (
                                        <sup className="CfbTicker-rank">#{g.away.rank}</sup>
                                    )}
                                    {g.away.logo && (
                                        <img
                                            className="CfbTicker-logo"
                                            src={g.away.logo}
                                            alt={g.away.abbr}
                                        />
                                    )}
                                    <span className="CfbTicker-abbr">{g.away.abbr}</span>
                                    {g.away.score !== undefined && (
                                        <span className="CfbTicker-score">{g.away.score}</span>
                                    )}

                                    <span className="CfbTicker-sep">@</span>

                                    {/* Home team */}
                                    {g.home.rank && g.home.rank <= 25 && (
                                        <sup className="CfbTicker-rank">#{g.home.rank}</sup>
                                    )}
                                    {g.home.logo && (
                                        <img
                                            className="CfbTicker-logo"
                                            src={g.home.logo}
                                            alt={g.home.abbr}
                                        />
                                    )}
                                    <span className="CfbTicker-abbr">{g.home.abbr}</span>
                                    {g.home.score !== undefined && (
                                        <span className="CfbTicker-score">{g.home.score}</span>
                                    )}

                                    <span className="CfbTicker-status">{g.status}</span>
                                    <span className="CfbTicker-divider">|</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
