<?php

namespace YourVendor\EspnCfbTicker\Api\Controller;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class GetScoresController implements RequestHandlerInterface
{
    /**
     * ESPN College Football Scoreboard API endpoint.
     * Uses the public ESPN v2 API which requires no key.
     */
    const ESPN_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

    /**
     * Cache TTL in seconds (30 seconds for live scores).
     */
    const CACHE_TTL = 30;

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $week     = $queryParams['week'] ?? null;
            $season   = $queryParams['season'] ?? null;
            $groups   = $queryParams['groups'] ?? '80'; // 80 = FBS (top-tier CFB)

            $url = self::ESPN_API_URL . '?' . http_build_query(array_filter([
                'groups' => $groups,
                'week'   => $week,
                'season' => $season,
                'limit'  => 100,
            ]));

            $context = stream_context_create([
                'http' => [
                    'method'  => 'GET',
                    'timeout' => 10,
                    'header'  => [
                        'User-Agent: Mozilla/5.0 (compatible; FlarumEspnTicker/1.0)',
                        'Accept: application/json',
                    ],
                ],
                'ssl' => [
                    'verify_peer'      => true,
                    'verify_peer_name' => true,
                ],
            ]);

            $raw = @file_get_contents($url, false, $context);

            if ($raw === false) {
                return new JsonResponse([
                    'error'  => 'Failed to fetch scores from ESPN.',
                    'games'  => [],
                    'status' => 'error',
                ], 502);
            }

            $data = json_decode($raw, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return new JsonResponse([
                    'error'  => 'Invalid JSON from ESPN API.',
                    'games'  => [],
                    'status' => 'error',
                ], 502);
            }

            $games = $this->parseGames($data);

            return new JsonResponse([
                'games'     => $games,
                'status'    => 'ok',
                'week'      => $data['week']['number'] ?? null,
                'season'    => $data['season']['year'] ?? null,
                'season_type' => $data['season']['type'] ?? null,
                'fetched_at' => date('c'),
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error'  => 'Internal error: ' . $e->getMessage(),
                'games'  => [],
                'status' => 'error',
            ], 500);
        }
    }

    private function parseGames(array $data): array
    {
        $games = [];

        foreach ($data['events'] ?? [] as $event) {
            $competition = $event['competitions'][0] ?? null;
            if (!$competition) {
                continue;
            }

            $competitors = $competition['competitors'] ?? [];
            $home = null;
            $away = null;

            foreach ($competitors as $competitor) {
                if ($competitor['homeAway'] === 'home') {
                    $home = $competitor;
                } else {
                    $away = $competitor;
                }
            }

            if (!$home || !$away) {
                continue;
            }

            $status      = $competition['status'] ?? [];
            $statusType  = $status['type'] ?? [];
            $situation   = $competition['situation'] ?? null;

            $games[] = [
                'id'          => $event['id'],
                'name'        => $event['name'],
                'short_name'  => $event['shortName'],
                'date'        => $event['date'],
                'status'      => [
                    'state'       => $statusType['state'] ?? 'pre',      // pre | in | post
                    'completed'   => $statusType['completed'] ?? false,
                    'description' => $status['type']['description'] ?? '',
                    'detail'      => $status['type']['shortDetail'] ?? '',
                    'period'      => $status['period'] ?? null,
                    'display_clock' => $status['displayClock'] ?? null,
                ],
                'home'        => $this->parseTeam($home),
                'away'        => $this->parseTeam($away),
                'tv'          => $this->parseBroadcast($competition),
                'venue'       => $this->parseVenue($competition),
                'situation'   => $situation ? [
                    'down'        => $situation['down'] ?? null,
                    'distance'    => $situation['distance'] ?? null,
                    'yard_line'   => $situation['yardLine'] ?? null,
                    'possession'  => $situation['possession'] ?? null,
                ] : null,
                'notes'       => $this->parseNotes($competition),
            ];
        }

        return $games;
    }

    private function parseTeam(array $competitor): array
    {
        $team   = $competitor['team'] ?? [];
        $record = $competitor['records'][0]['summary'] ?? null;
        $rank   = $competitor['curatedRank']['current'] ?? null;

        return [
            'id'           => $team['id'] ?? null,
            'name'         => $team['name'] ?? '',
            'abbreviation' => $team['abbreviation'] ?? '',
            'display_name' => $team['displayName'] ?? '',
            'short_name'   => $team['shortDisplayName'] ?? '',
            'logo'         => $team['logo'] ?? null,
            'color'        => '#' . ($team['color'] ?? 'CC0000'),
            'alt_color'    => '#' . ($team['alternateColor'] ?? 'FFFFFF'),
            'score'        => $competitor['score'] ?? null,
            'record'       => $record,
            'rank'         => ($rank && $rank <= 25) ? $rank : null,
            'winner'       => $competitor['winner'] ?? null,
        ];
    }

    private function parseBroadcast(array $competition): ?string
    {
        foreach ($competition['broadcasts'] ?? [] as $broadcast) {
            return $broadcast['names'][0] ?? null;
        }
        return null;
    }

    private function parseVenue(array $competition): ?string
    {
        $venue = $competition['venue'] ?? null;
        if (!$venue) {
            return null;
        }
        $city  = $venue['address']['city'] ?? '';
        $state = $venue['address']['state'] ?? '';
        return $city && $state ? "$city, $state" : ($city ?: null);
    }

    private function parseNotes(array $competition): ?string
    {
        foreach ($competition['notes'] ?? [] as $note) {
            if (!empty($note['headline'])) {
                return $note['headline'];
            }
        }
        return null;
    }
}
