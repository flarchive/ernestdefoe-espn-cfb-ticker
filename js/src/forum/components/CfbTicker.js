import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

const ESPN_API_URL =
    'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=50';

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
        const secs = parseInt(
            app.forum.attribute('ernestdefoe-espn-cfb-ticker.refreshInterval') || 60,
            10
        );
        this._interval = setInterval(this.refresh, Math.max(15, secs) * 1000);
    }

    onremove(vnode) {
        super.onremove(vnode);
        if (this._interval) clearInterval(this._interval);
    }

    async refresh() {
        try {
            const res = await fetch(ESPN_API_URL);
            if (!res.ok) throw new Error('ESPN API ' + res.status);
            const data = await res.json();
            this.games = (data.events || []).map(formatGame).filter(Boolean);
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

        let trackContent;
        if (this.loading) {
            trackContent = m(LoadingIndicator, { size: 'small' });
        } else if (this.error) {
            trackContent = m('span.CfbTicker-error', this.error);
        } else if (this.games.length === 0) {
            trackContent = m('span.CfbTicker-empty', 'No FBS games scheduled today.');
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
                m('span', 'CFB'),
            ]),
            m('div.CfbTicker-track-wrapper', trackContent),
        ]);
    }

    gameChip(g, i) {
        const cls = 'span.CfbTicker-game' + (g.live ? '.CfbTicker-game--live' : '');
        const children = [];

        if (g.live) children.push(m('span.CfbTicker-live-dot', { title: 'Live' }));

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
