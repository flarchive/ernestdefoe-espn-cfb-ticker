import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import type Mithril from 'mithril';
import crestUrl from '../crest';

// @cfb-ticker-logo-size in less/forum.less. Not lazy: the ticker is a moving
// marquee, and the crests in it are the content.
const LOGO_PX = 18;

// The icon beside each league, by the id the forum sends (src/Scoreboard.php).
// A fight league draws "A vs B" and marks the winner, since bouts have no score.
const LEAGUES: Record<string, { icon: string; fight?: boolean }> = {
  'college-football': { icon: 'fa-football' },
  nfl: { icon: 'fa-football' },
  'mens-college-basketball': { icon: 'fa-basketball' },
  'womens-college-basketball': { icon: 'fa-basketball' },
  nba: { icon: 'fa-basketball' },
  wnba: { icon: 'fa-basketball' },
  mlb: { icon: 'fa-baseball' },
  nhl: { icon: 'fa-hockey-puck' },
  ufc: { icon: 'fa-hand-fist', fight: true },
  pfl: { icon: 'fa-hand-fist', fight: true },
};

const leagueName = (id: string) => app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.leagues.' + id) as string;

interface TickerTeam {
  abbr: string;
  logo: string | null;
  score?: string;
  rank: number | null;
  winner: boolean;
}

interface TickerGame {
  id: string;
  live: boolean;
  status: string;
  away: TickerTeam;
  home: TickerTeam;
}

interface TickerLeague {
  id: string;
  games: TickerGame[];
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
      winner: !!away.winner,
    },
    home: {
      abbr: home.team?.abbreviation || home.team?.displayName || '?',
      logo: home.team?.logo || null,
      score: home.score,
      rank: home.curatedRank?.current || null,
      winner: !!home.winner,
    },
  };
}

export default class CfbTicker extends Component {
  leagues: TickerLeague[] = [];
  loading: boolean = true;
  error: string | null = null;
  _interval: ReturnType<typeof setInterval> | null = null;
  _stale: boolean = false;
  _onVisibility: (() => void) | null = null;

  oninit(vnode: Mithril.Vnode<Record<string, unknown>, this>) {
    super.oninit(vnode);
    this.leagues = [];
    this.loading = true;
    this.error = null;
    this._interval = null;
    this.refresh = this.refresh.bind(this);
  }

  oncreate(vnode: Mithril.Vnode<Record<string, unknown>, this>) {
    super.oncreate(vnode);
    this.refresh();
    const secs = parseInt(app.forum.attribute('ernestdefoe-espn-cfb-ticker.refreshInterval') || '60', 10);
    // A tab nobody is looking at does not poll: the tick only marks the
    // scores stale, and the tab fetches once when it is shown again.
    this._interval = setInterval(
      () => {
        if (document.hidden) {
          this._stale = true;
          return;
        }
        this.refresh();
      },
      Math.max(15, secs) * 1000
    );

    this._onVisibility = () => {
      if (!document.hidden && this._stale) {
        this._stale = false;
        this.refresh();
      }
    };
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  onremove(vnode: Mithril.Vnode<Record<string, unknown>, this>) {
    super.onremove(vnode);
    if (this._interval) clearInterval(this._interval);
    if (this._onVisibility) document.removeEventListener('visibilitychange', this._onVisibility);
  }

  async refresh() {
    // The forum fetches ESPN for us (src/Scoreboard.php): ESPN sometimes
    // answers browsers without CORS headers. Abort if the forum hangs, so the
    // ticker is never stuck "loading" (there is no native fetch timeout).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(app.forum.attribute('apiUrl') + '/espn-cfb-ticker/scoreboard', { signal: controller.signal });
      if (!res.ok) throw new Error('Scoreboard ' + res.status);
      const data = await res.json();
      this.leagues = (data.leagues || [])
        .filter((l: any) => LEAGUES[l.id])
        .map((l: any) => ({ id: l.id, games: (l.events || []).map(formatGame).filter(Boolean) as TickerGame[] }))
        .filter((l: TickerLeague) => l.games.length);
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
    const speed = parseInt(app.forum.attribute('ernestdefoe-espn-cfb-ticker.scrollSpeed') || '40', 10);
    const position = app.forum.attribute('ernestdefoe-espn-cfb-ticker.position') || 'top';
    const chosen = (app.forum.attribute<string[]>('ernestdefoe-espn-cfb-ticker.leagues') || ['college-football']).filter((id) => LEAGUES[id]);
    // One league keeps the bar as it always was: its name in the badge, no
    // tags in the track. Several get a tag at the head of each league's games.
    const single = chosen.length === 1 ? chosen[0] : null;
    const games = this.leagues.reduce((n, l) => n + l.games.length, 0);

    let trackContent: Mithril.Children;
    if (this.loading) {
      trackContent = m(LoadingIndicator, { size: 'small' });
    } else if (this.error) {
      trackContent = m('span.CfbTicker-error', this.error);
    } else if (games === 0) {
      trackContent = m(
        'span.CfbTicker-empty',
        app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.ticker.' + (single === 'college-football' ? 'no_games' : 'no_games_any'))
      );
    } else {
      const duration = Math.max(10, games * speed);
      // Twice over for a seamless loop. Built once per copy: Mithril cannot
      // draw one vnode in two places.
      const chips = (copy: string) =>
        this.leagues.flatMap((l) => [
          // Spread, not a null hole: a keyed list may not mix in unkeyed slots.
          ...(single ? [] : [m('span.CfbTicker-league', { key: copy + l.id }, [m('i.fa-solid.' + LEAGUES[l.id].icon), leagueName(l.id)])]),
          ...l.games.map((g) => this.gameChip(g, copy + l.id + ':', !!LEAGUES[l.id].fight)),
        ]);
      trackContent = m('div.CfbTicker-track', { style: 'animation-duration:' + duration + 's' }, [...chips('a'), ...chips('b')]);
    }

    return m('div.CfbTicker.CfbTicker--' + position, [
      m('div.CfbTicker-label', [
        m('i.fa-solid.' + (single ? LEAGUES[single].icon : 'fa-trophy')),
        m(
          'span',
          single === 'college-football' || !single
            ? app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.ticker.' + (single ? 'label' : 'label_many'))
            : leagueName(single)
        ),
      ]),
      m('div.CfbTicker-track-wrapper', trackContent),
    ]);
  }

  gameChip(g: TickerGame, key: string, fight: boolean) {
    const cls = 'span.CfbTicker-game' + (g.live ? '.CfbTicker-game--live' : '');
    const decided = fight && (g.away.winner || g.home.winner);
    const children: Mithril.Children[] = [];

    if (g.live) children.push(m('span.CfbTicker-live-dot', { title: app.translator.trans('ernestdefoe-espn-cfb-ticker.forum.status.live') }));

    this.side(children, g.away, decided);
    children.push(m('span.CfbTicker-sep', fight ? 'vs' : '@'));
    this.side(children, g.home, decided);

    children.push(m('span.CfbTicker-status', g.status));
    children.push(m('span.CfbTicker-divider', '|'));

    return m(cls, { key: key + g.id }, children);
  }

  side(children: Mithril.Children[], team: TickerTeam, decided: boolean) {
    if (team.rank && team.rank <= 25) children.push(m('sup.CfbTicker-rank', '#' + team.rank));
    if (team.logo) children.push(m('img.CfbTicker-logo', { src: crestUrl(team.logo, LOGO_PX), alt: team.abbr, decoding: 'async' }));
    children.push(m('span.CfbTicker-abbr' + (decided ? (team.winner ? '.CfbTicker-abbr--winner' : '.CfbTicker-abbr--loser') : ''), team.abbr));
    if (team.score !== undefined && team.score !== null) children.push(m('span.CfbTicker-score', team.score));
  }
}
