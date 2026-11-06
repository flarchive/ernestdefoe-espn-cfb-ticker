<?php

namespace Ernestdefoe\EspnCfbTicker\Tests\integration\api;

use Ernestdefoe\EspnCfbTicker\Scoreboard;
use Flarum\Testing\integration\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Illuminate\Contracts\Cache\Repository as Cache;
use PHPUnit\Framework\Attributes\Test;

/**
 * The forum fetches ESPN for the bar: browsers were refused when ESPN
 * answered without CORS headers. One upstream call is shared by everyone,
 * nothing a visitor sends reaches it, and an outage serves the last copy.
 */
class ScoreboardTest extends TestCase
{
    private array $sent = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-espn-cfb-ticker');
    }

    /** ESPN answers with $responses, in order; a call past the end fails the test. */
    private function espn(array $responses): void
    {
        $c = $this->app()->getContainer();
        $c->make(Cache::class)->flush();

        $this->sent = [];
        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($this->sent));

        $c->instance(Scoreboard::class, new class($c->make(Cache::class), $stack) extends Scoreboard {
            public function __construct(Cache $cache, private HandlerStack $stack)
            {
                parent::__construct($cache);
            }

            protected function client(): Client
            {
                return new Client(['handler' => $this->stack]);
            }
        });
    }

    private static function game(string $id, string $away = 'BAMA'): Response
    {
        return new Response(200, [], json_encode(['leagues' => [['big' => 'payload']], 'events' => [[
            'id' => $id,
            'name' => 'dropped',
            'status' => ['type' => ['state' => 'in', 'shortDetail' => 'Q2 4:12', 'description' => 'dropped']],
            'competitions' => [['venue' => 'dropped', 'competitors' => [
                ['homeAway' => 'away', 'score' => '14', 'curatedRank' => ['current' => 3], 'team' => ['abbreviation' => $away, 'displayName' => 'Alabama', 'logo' => 'https://a.espncdn.com/a.png', 'color' => 'dropped']],
                ['homeAway' => 'home', 'score' => '7', 'curatedRank' => ['current' => 99], 'team' => ['abbreviation' => 'UGA', 'displayName' => 'Georgia', 'logo' => 'https://a.espncdn.com/b.png']],
            ]]],
        ]]]));
    }

    private function get(string $query = ''): array
    {
        $response = $this->send($this->request('GET', '/api/espn-cfb-ticker/scoreboard'.$query));

        return [$response->getStatusCode(), json_decode((string) $response->getBody(), true)];
    }

    #[Test]
    public function a_guest_gets_only_what_the_bar_draws()
    {
        $this->espn([self::game('401')]);

        [$status, $body] = $this->get();

        $this->assertSame(200, $status);
        $this->assertSame('college-football', $body['leagues'][0]['id']);
        $event = $body['leagues'][0]['events'][0];
        $this->assertSame('401', $event['id']);
        $this->assertSame(['state' => 'in', 'shortDetail' => 'Q2 4:12'], $event['status']['type']);
        $this->assertSame(
            ['homeAway' => 'away', 'score' => '14', 'curatedRank' => ['current' => 3], 'team' => ['abbreviation' => 'BAMA', 'displayName' => 'Alabama', 'logo' => 'https://a.espncdn.com/a.png']],
            $event['competitions'][0]['competitors'][0]
        );
        $this->assertSame(['leagues'], array_keys($body));
        $this->assertSame(['id', 'events'], array_keys($body['leagues'][0]), "ESPN's own league blob is dropped");
        $this->assertArrayNotHasKey('name', $event);
    }

    #[Test]
    public function nothing_the_visitor_sends_reaches_espn()
    {
        $this->espn([self::game('401')]);

        [$status] = $this->get('?url='.urlencode('http://169.254.169.254/').'&groups=1&limit=999');

        $this->assertSame(200, $status);
        $this->assertCount(1, $this->sent);
        $this->assertSame(Scoreboard::url('college-football'), (string) $this->sent[0]['request']->getUri());
    }

    #[Test]
    public function every_visitor_shares_one_upstream_call()
    {
        $this->espn([self::game('401')]);

        $this->get();
        $this->get('?groups=1');
        [$status, $body] = $this->get();

        $this->assertSame(200, $status);
        $this->assertSame('401', $body['leagues'][0]['events'][0]['id']);
        $this->assertCount(1, $this->sent, 'Later requests must come from the cache');
    }

    #[Test]
    public function an_espn_outage_serves_the_last_good_copy()
    {
        $this->espn([self::game('401'), new Response(500)]);

        $this->get();
        $this->app()->getContainer()->make(Cache::class)->forget('ernestdefoe-espn-cfb-ticker.scoreboard');
        [$status, $body] = $this->get();

        $this->assertSame(200, $status);
        $this->assertSame('401', $body['leagues'][0]['events'][0]['id']);
        $this->assertCount(2, $this->sent);
    }

    #[Test]
    public function an_outage_with_no_copy_is_a_clean_error_and_backs_off()
    {
        $this->espn([new Response(200, [], 'not json')]);

        [$status, $body] = $this->get();
        [$again] = $this->get();

        $this->assertSame(502, $status);
        $this->assertSame('scores_unavailable', $body['errors'][0]['code']);
        $this->assertSame(502, $again);
        $this->assertCount(1, $this->sent, 'A failure must not be retried on every page view');
    }

    #[Test]
    public function the_chosen_leagues_are_fetched_together_in_the_admins_order()
    {
        $this->setting('ernestdefoe-espn-cfb-ticker.leagues', 'nhl, nfl,bogus');
        $this->espn([self::game('1', 'BUF'), self::game('2', 'BOS')]);

        [$status, $body] = $this->get();

        $this->assertSame(200, $status);
        $this->assertSame(['nfl', 'nhl'], array_column($body['leagues'], 'id'), 'Display order is the server list; unknown ids are dropped');
        $this->assertCount(2, $this->sent);
        $urls = array_map(fn ($t) => (string) $t['request']->getUri(), $this->sent);
        sort($urls);
        $this->assertSame([Scoreboard::url('nfl'), Scoreboard::url('nhl')], $urls);
    }

    #[Test]
    public function one_league_down_does_not_take_the_others_with_it()
    {
        $this->setting('ernestdefoe-espn-cfb-ticker.leagues', 'nfl,nba');
        $this->espn([self::game('1'), new Response(503)]);

        [$status, $body] = $this->get();

        $this->assertSame(200, $status);
        $this->assertCount(1, $body['leagues']);
    }

    #[Test]
    public function a_fight_card_becomes_one_chip_per_bout_main_event_first()
    {
        $this->setting('ernestdefoe-espn-cfb-ticker.leagues', 'ufc');
        $bout = fn (string $id, string $a, string $b, bool $aWon) => [
            'id' => $id,
            'status' => ['type' => ['state' => 'post', 'shortDetail' => 'Final']],
            'competitors' => [
                ['order' => 2, 'winner' => ! $aWon, 'athlete' => ['shortName' => $b, 'displayName' => $b, 'flag' => ['href' => 'https://a.espncdn.com/i/teamlogos/countries/500/usa.png']]],
                ['order' => 1, 'winner' => $aWon, 'athlete' => ['shortName' => $a, 'displayName' => $a]],
            ],
        ];
        $this->espn([new Response(200, [], json_encode(['events' => [[
            'id' => '600',
            'status' => ['type' => ['state' => 'post']],
            'competitions' => [$bout('1', 'A. Prelim', 'B. Prelim', true), $bout('2', 'R. Moicano', 'T. Nolan', false)],
        ]]]))]);

        [$status, $body] = $this->get();

        $this->assertSame(200, $status);
        $events = $body['leagues'][0]['events'];
        $this->assertSame(['2', '1'], array_column($events, 'id'));
        $main = $events[0]['competitions'][0]['competitors'];
        $this->assertSame(['home', 'away'], array_column($main, 'homeAway'), 'Order 1 is drawn first, as the away side');
        $this->assertSame([true, false], array_column($main, 'winner'));
        $this->assertSame('T. Nolan', $main[0]['team']['abbreviation']);
        $this->assertSame('https://a.espncdn.com/i/teamlogos/countries/500/usa.png', $main[0]['team']['logo']);
    }

    #[Test]
    public function an_off_season_league_drops_its_last_final_after_a_week()
    {
        $this->setting('ernestdefoe-espn-cfb-ticker.leagues', 'mlb,nfl');
        $old = json_decode((string) self::game('9')->getBody(), true);
        $old['events'][0]['date'] = gmdate('Y-m-d\TH:i\Z', time() - 8 * 86400);
        $old['events'][0]['status']['type']['state'] = 'post';
        $recent = json_decode((string) self::game('1')->getBody(), true);
        $recent['events'][0]['date'] = gmdate('Y-m-d\TH:i\Z', time() - 3 * 86400);
        $recent['events'][0]['status']['type']['state'] = 'post';
        $this->espn([new Response(200, [], json_encode($recent)), new Response(200, [], json_encode($old))]);

        [, $body] = $this->get();

        $byLeague = array_column($body['leagues'], 'events', 'id');
        $this->assertSame(['1'], array_column($byLeague['nfl'], 'id'), "Last weekend's finals stay");
        $this->assertSame([], $byLeague['mlb']);
    }

    #[Test]
    public function an_expired_copy_is_refreshed_by_one_request_while_the_rest_serve_it()
    {
        $this->espn([self::game('401'), self::game('402')]);
        $cache = $this->app()->getContainer()->make(Cache::class);

        $this->get();
        $cache->forget('ernestdefoe-espn-cfb-ticker.scoreboard');
        $cache->add('ernestdefoe-espn-cfb-ticker.scoreboard.lock', true, 15); // another request is refreshing
        [$status, $body] = $this->get();

        $this->assertSame(200, $status);
        $this->assertSame('401', $body['leagues'][0]['events'][0]['id']);
        $this->assertCount(1, $this->sent, 'Only the request holding the lock asks ESPN');
    }
}
