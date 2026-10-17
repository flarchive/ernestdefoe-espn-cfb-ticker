<?php

namespace Ernestdefoe\EspnCfbTicker;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\Arr;

/**
 * ESPN's FBS scoreboard, fetched by the forum instead of each visitor's
 * browser: ESPN now and then answers without CORS headers, which the browser
 * refuses. Every visitor shares one upstream call per FRESH_TTL, and when
 * ESPN is down the last good copy is served instead of an error.
 */
class Scoreboard
{
    // Fixed: nothing a visitor sends ever reaches the upstream request.
    public const URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=50';

    protected const FRESH = 'ernestdefoe-espn-cfb-ticker.scoreboard';
    protected const STALE = 'ernestdefoe-espn-cfb-ticker.scoreboard.stale';
    protected const BACKOFF = 'ernestdefoe-espn-cfb-ticker.scoreboard.backoff';

    protected const FRESH_TTL = 45;
    protected const STALE_TTL = 86400;
    // After a failed fetch, wait this long before asking ESPN again, so an
    // outage does not cost every page view a timeout.
    protected const BACKOFF_TTL = 15;

    public function __construct(protected Cache $cache)
    {
    }

    /** The trimmed scoreboard, or null when ESPN is down and no copy is kept. */
    public function get(): ?array
    {
        $fresh = $this->cache->get(self::FRESH);
        if (is_array($fresh)) {
            return $fresh;
        }

        if (! $this->cache->get(self::BACKOFF)) {
            try {
                $data = $this->fetch();
                $this->cache->put(self::FRESH, $data, self::FRESH_TTL);
                $this->cache->put(self::STALE, $data, self::STALE_TTL);

                return $data;
            } catch (GuzzleException|\JsonException|\UnexpectedValueException) {
                $this->cache->put(self::BACKOFF, true, self::BACKOFF_TTL);
            }
        }

        $stale = $this->cache->get(self::STALE);

        return is_array($stale) ? $stale : null;
    }

    protected function client(): Client
    {
        return new Client(['timeout' => 5, 'connect_timeout' => 3]);
    }

    protected function fetch(): array
    {
        $body = json_decode((string) $this->client()->get(self::URL, ['headers' => ['Accept' => 'application/json']])->getBody(), true, 64, JSON_THROW_ON_ERROR);
        if (! is_array($body) || ! is_array($body['events'] ?? null)) {
            throw new \UnexpectedValueException('ESPN scoreboard without events');
        }

        return ['events' => array_values(array_map(self::trim(...), array_filter($body['events'], 'is_array')))];
    }

    /** Only what the bar draws, in ESPN's own shape, so the bundle reads it unchanged. */
    protected static function trim(array $event): array
    {
        $competitors = Arr::get($event, 'competitions.0.competitors');

        return [
            'id' => (string) Arr::get($event, 'id', ''),
            'status' => ['type' => [
                'state' => Arr::get($event, 'status.type.state'),
                'shortDetail' => Arr::get($event, 'status.type.shortDetail'),
            ]],
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
}
