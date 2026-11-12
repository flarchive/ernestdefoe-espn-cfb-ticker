<?php

namespace Ernestdefoe\EspnCfbTicker;

use GuzzleHttp\Client;
use GuzzleHttp\Promise\Utils;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;

/**
 * ESPN's scoreboards, fetched by the forum instead of each visitor's browser:
 * ESPN now and then answers without CORS headers, which the browser refuses.
 * Every visitor shares one upstream call per league per FRESH_TTL, and when
 * ESPN is down the last good copy is served instead of an error.
 */
class Scoreboard
{
    public const BASE = 'https://site.api.espn.com/apis/site/v2/sports/';

    /**
     * Every league the bar can show, in the order it shows them. Fixed:
     * nothing a visitor sends ever reaches the upstream request.
     *
     * 🚨 The college scoreboards without `groups` are a FEATURED subset (24 of
     * 86 games one Saturday): 80 is FBS, 50 is Division I basketball.
     */
    public const LEAGUES = [
        'college-football' => 'football/college-football/scoreboard?groups=80&limit=50',
        'nfl' => 'football/nfl/scoreboard',
        'mens-college-basketball' => 'basketball/mens-college-basketball/scoreboard?groups=50&limit=200',
        'womens-college-basketball' => 'basketball/womens-college-basketball/scoreboard?groups=50&limit=200',
        'nba' => 'basketball/nba/scoreboard',
        'wnba' => 'basketball/wnba/scoreboard',
        'mlb' => 'baseball/mlb/scoreboard',
        'nhl' => 'hockey/nhl/scoreboard',
        'ufc' => 'mma/ufc/scoreboard',
        'pfl' => 'mma/pfl/scoreboard',
    ];

    public const DEFAULT = 'college-football';

    // MMA cards are one event of many bouts; each bout is drawn like a game.
    protected const FIGHTS = ['ufc', 'pfl'];

    protected const FRESH = 'ernestdefoe-espn-cfb-ticker.scoreboard';
    protected const STALE = 'ernestdefoe-espn-cfb-ticker.scoreboard.stale';
    protected const BACKOFF = 'ernestdefoe-espn-cfb-ticker.scoreboard.backoff';
    protected const LOCK = 'ernestdefoe-espn-cfb-ticker.scoreboard.lock';

    protected const FRESH_TTL = 45;
    protected const STALE_TTL = 86400;
    // After a failed fetch, wait this long before asking ESPN again, so an
    // outage does not cost every page view a timeout.
    protected const BACKOFF_TTL = 15;
    // Out of season ESPN keeps answering with the last game played (the
    // World Series, all winter). A week keeps a football week's finals.
    protected const FINISHED_FOR = 7 * 86400;

    public function __construct(protected Cache $cache)
    {
    }

    /** The known leagues in a comma-joined setting, in display order; college football when none are. */
    public static function chosen(?string $setting): array
    {
        $picked = array_map('trim', explode(',', (string) $setting));
        $known = array_values(array_filter(array_keys(self::LEAGUES), fn ($id) => in_array($id, $picked, true)));

        return $known ?: [self::DEFAULT];
    }

    public static function url(string $league): string
    {
        return self::BASE.self::LEAGUES[$league];
    }

    /**
     * [['id' => league, 'events' => [...]], ...] for every league with a copy
     * to show, or null when ESPN is down and nothing is kept for any of them.
     *
     * @param string[] $leagues known league ids
     */
    public function get(array $leagues): ?array
    {
        $data = [];
        $due = [];

        foreach ($leagues as $id) {
            $fresh = $this->cache->get($this->key(self::FRESH, $id));
            if (is_array($fresh)) {
                $data[$id] = $fresh;
            } elseif (! $this->cache->get($this->key(self::BACKOFF, $id)) && $this->claim($id)) {
                $due[] = $id;
            }
        }

        // Expired leagues are fetched side by side, so ten leagues cost one
        // timeout at worst, not ten.
        if ($due) {
            $client = $this->client();
            $results = Utils::settle(array_combine($due, array_map(
                fn ($id) => $client->getAsync(self::url($id), ['headers' => ['Accept' => 'application/json']]),
                $due
            )))->wait();

            foreach ($results as $id => $result) {
                try {
                    if ($result['state'] !== 'fulfilled') {
                        throw new \UnexpectedValueException('ESPN request failed');
                    }
                    $data[$id] = $this->parse($id, $result['value']);
                    $this->cache->put($this->key(self::FRESH, $id), $data[$id], self::FRESH_TTL);
                    $this->cache->put($this->key(self::STALE, $id), $data[$id], self::STALE_TTL);
                } catch (\JsonException|\UnexpectedValueException) {
                    $this->cache->put($this->key(self::BACKOFF, $id), true, self::BACKOFF_TTL);
                }
            }
        }

        $out = [];
        foreach ($leagues as $id) {
            $events = $data[$id] ?? $this->cache->get($this->key(self::STALE, $id));
            if (is_array($events)) {
                $out[] = ['id' => $id, 'events' => $events];
            }
        }

        return $out ? $out : null;
    }

    /**
     * Whether this request refreshes the league. When the copy expires under
     * a crowd, one request asks ESPN and the rest serve the last copy; with
     * no copy to serve yet, everyone asks.
     */
    protected function claim(string $league): bool
    {
        return ! is_array($this->cache->get($this->key(self::STALE, $league)))
            || $this->cache->add($this->key(self::LOCK, $league), true, self::FRESH_TTL / 3);
    }

    // College football keeps the keys it had before other leagues existed, so
    // an update starts from the copy already cached.
    protected function key(string $prefix, string $league): string
    {
        return $league === self::DEFAULT ? $prefix : $prefix.'.'.$league;
    }

    protected function client(): Client
    {
        return new Client(['timeout' => 5, 'connect_timeout' => 3]);
    }

    protected function parse(string $league, ResponseInterface $response): array
    {
        if ($response->getStatusCode() !== 200) {
            throw new \UnexpectedValueException('ESPN answered '.$response->getStatusCode());
        }

        $body = json_decode((string) $response->getBody(), true, 64, JSON_THROW_ON_ERROR);
        if (! is_array($body) || ! is_array($body['events'] ?? null)) {
            throw new \UnexpectedValueException('ESPN scoreboard without events');
        }

        $cutoff = time() - self::FINISHED_FOR;
        $events = array_filter($body['events'], fn ($e) => is_array($e)
            && ! (Arr::get($e, 'status.type.state') === 'post' && ($at = strtotime((string) Arr::get($e, 'date'))) && $at < $cutoff));

        if (in_array($league, self::FIGHTS, true)) {
            // ESPN lists a card's bouts from the first prelim to the main
            // event; the bar leads with the main event.
            return array_values(array_merge(...array_map(
                fn (array $event) => array_reverse(array_map(self::bout(...), array_filter((array) Arr::get($event, 'competitions', []), 'is_array'))),
                $events
            )));
        }

        return array_values(array_map(self::trim(...), $events));
    }

    /** Only what the bar draws, in ESPN's own shape, so the bundle reads it unchanged. */
    protected static function trim(array $event): array
    {
        $competitors = Arr::get($event, 'competitions.0.competitors');

        return [
            'id' => (string) Arr::get($event, 'id', ''),
            'status' => self::status($event),
            'competitions' => [[
                'competitors' => array_values(array_map(fn (array $c) => [
                    'homeAway' => Arr::get($c, 'homeAway'),
                    'score' => Arr::get($c, 'score'),
                    'curatedRank' => ['current' => Arr::get($c, 'curatedRank.current')],
                    'team' => [
                        'abbreviation' => Arr::get($c, 'team.abbreviation'),
                        'displayName' => Arr::get($c, 'team.displayName'),
                        'logo' => Arr::get($c, 'team.logo'),
                    ],
                ], array_filter(is_array($competitors) ? $competitors : [], 'is_array'))),
            ]],
        ];
    }

    /**
     * One bout in the same shape as a game: the fighters stand in for the
     * teams (short name, country flag), with no score and the winner marked.
     * Order 1 is drawn first, as ESPN lists the bout.
     */
    protected static function bout(array $bout): array
    {
        $fighters = array_filter((array) Arr::get($bout, 'competitors', []), 'is_array');

        return [
            'id' => (string) Arr::get($bout, 'id', ''),
            'status' => self::status($bout),
            'competitions' => [[
                'competitors' => array_values(array_map(fn (array $c) => [
                    'homeAway' => (int) Arr::get($c, 'order') === 1 ? 'away' : 'home',
                    'winner' => (bool) Arr::get($c, 'winner'),
                    'team' => [
                        'abbreviation' => Arr::get($c, 'athlete.shortName'),
                        'displayName' => Arr::get($c, 'athlete.displayName'),
                        'logo' => Arr::get($c, 'athlete.flag.href'),
                    ],
                ], $fighters)),
            ]],
        ];
    }

    protected static function status(array $event): array
    {
        return ['type' => [
            'state' => Arr::get($event, 'status.type.state'),
            'shortDetail' => Arr::get($event, 'status.type.shortDetail'),
        ]];
    }
}
