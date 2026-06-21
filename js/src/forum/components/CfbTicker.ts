import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import type Mithril from 'mithril';

const ESPN_API_URL =
    'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=50';

interface TickerTeam {
    abbr: string;
    logo: string | null;
    score?: string;
    rank: number | null;
}

interface TickerGame {
    id: string;
    live: boolean;
    status: string;
    away: TickerTeam;
    home: TickerTeam;
}

// The ESPN scoreboard payload is an untyped external API, so the raw event is
// `any`; we normalise it into the typed TickerGame shape used by the view.
function statusLabel(event: any): string {
    const state = event.status?.type?.state;
    const detail = event.status?.type?.shortDetail || '';
    if (state === 'pre') return detail || app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.status.upcoming');
    if (state === 'in') return detail || app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.status.live');
    if (state === 'post') return app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.status.final') as string;
    return detail;
}

function isLive(event: any): boolean {
    return event.status?.type?.state === 'in';
}

function formatGame(event: any): TickerGame | null {
    const comps = event.competitions?.[0];
    if (!comps) return null;

    const home = comps.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comps.competitors?.find((c: any) => c.homeAway === 'away');
    if (!home || !away) return null;

    return {
        id: event.id,
        live: isLive(event),
        status: statusLabel(event),
        away: {
            abbr: away.team?.abbreviation || away.team?.displayName || '?',
            logo: away.team?.logo || null,
            score: away.score,
            rank: away.curatedRank?.current || null,
        },
        home: {
            abbr: home.team?.abbreviation || home.team?.displayName || '?',
            logo: home.team?.logo || null,
            score: home.score,
            rank: home.curatedRank?.current || null,
        },
    };
}

export default class CfbTicker extends Component {
    games: TickerGame[] = [];
    loading: boolean = true;
    error: string | null = null;
    _interval: ReturnType<typeof setInterval> | null = null;

    oninit(vnode: Mithril.Vnode<Record<string, unknown>, this>) {
        super.oninit(vnode);
        this.games = [];
        this.loading = true;
        this.error = null;
        this._interval = null;
        this.refresh = this.refresh.bind(this);
    }

    oncreate(vnode: Mithril.Vnode<Record<string, unknown>, this>) {
        super.oncreate(vnode);
        this.refresh();
        const secs = parseInt(
            app.forum.attribute('ernestdefoe-espn-cfb-ticker.refreshInterval') || '60',
            10
        );
        this._interval = setInterval(this.refresh, Math.max(15, secs) * 1000);
    }

    onremove(vnode: Mithril.Vnode<Record<string, unknown>, this>) {
        super.onremove(vnode);
        if (this._interval) clearInterval(this._interval);
    }

    async refresh() {
        // Abort the ESPN request if it hangs, so a slow/stalled CDN never leaves
        // the ticker stuck "loading" forever (there is no native fetch timeout).
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetch(ESPN_API_URL, { signal: controller.signal });
            if (!res.ok) throw new Error('ESPN API ' + res.status);
            const data = await res.json();
            this.games = (data.events || []).map(formatGame).filter(Boolean) as TickerGame[];
            this.error = null;
        } catch (e) {
            console.error('[CfbTicker]', e);
            this.error = app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.ticker.load_error') as string;
        } finally {
            clearTimeout(timer);
            this.loading = false;
            m.redraw();
        }
    }

    view() {
        const speed = parseInt(
            app.forum.attribute('ernestdefoe-espn-cfb-ticker.scrollSpeed') || '40',
            10
        );
        const position = app.forum.attribute('ernestdefoe-espn-cfb-ticker.position') || 'top';

        let trackContent: Mithril.Children;
        if (this.loading) {
            trackContent = m(LoadingIndicator, { size: 'small' });
        } else if (this.error) {
            trackContent = m('span.CfbTicker-error', this.error);
        } else if (this.games.length === 0) {
            trackContent = m('span.CfbTicker-empty', app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.ticker.no_games'));
        } else {
            const duration = Math.max(10, this.games.length * speed);
            const allGames = [...this.games, ...this.games];
            trackContent = m(
                'div.CfbTicker-track',
                { style: 'animation-duration:' + duration + 's' },
                allGames.map((g, i) => this.gameChip(g, i))
            );
        }

        return m('div.CfbTicker.CfbTicker--' + position, [
            m('div.CfbTicker-label', [
                m('i.fa-solid.fa-football'),
                m('span', app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.ticker.label')),
            ]),
            m('div.CfbTicker-track-wrapper', trackContent),
        ]);
    }

    gameChip(g: TickerGame, i: number) {
        const cls = 'span.CfbTicker-game' + (g.live ? '.CfbTicker-game--live' : '');
        const children: Mithril.Children[] = [];

        if (g.live) children.push(m('span.CfbTicker-live-dot', { title: app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.status.live') }));

        if (g.away.rank && g.away.rank <= 25) children.push(m('sup.CfbTicker-rank', '#' + g.away.rank));
        if (g.away.logo) children.push(m('img.CfbTicker-logo', { src: g.away.logo, alt: g.away.abbr }));
        children.push(m('span.CfbTicker-abbr', g.away.abbr));
        if (g.away.score !== undefined) children.push(m('span.CfbTicker-score', g.away.score));

        children.push(m('span.CfbTicker-sep', '@'));

        if (g.home.rank && g.home.rank <= 25) children.push(m('sup.CfbTicker-rank', '#' + g.home.rank));
        if (g.home.logo) children.push(m('img.CfbTicker-logo', { src: g.home.logo, alt: g.home.abbr }));
        children.push(m('span.CfbTicker-abbr', g.home.abbr));
        if (g.home.score !== undefined) children.push(m('span.CfbTicker-score', g.home.score));

        children.push(m('span.CfbTicker-status', g.status));
        children.push(m('span.CfbTicker-divider', '|'));

        return m(cls, { key: g.id + '-' + i }, children);
    }
}
