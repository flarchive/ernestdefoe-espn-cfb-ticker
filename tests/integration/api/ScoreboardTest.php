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
        $event = $body['events'][0];
        $this->assertSame('401', $event['id']);
        $this->assertSame(['state' => 'in', 'shortDetail' => 'Q2 4:12'], $event['status']['type']);
        $this->assertSame(
            ['homeAway' => 'away', 'score' => '14', 'curatedRank' => ['current' => 3], 'team' => ['abbreviation' => 'BAMA', 'displayName' => 'Alabama', 'logo' => 'https://a.espncdn.com/a.png']],
            $event['competitions'][0]['competitors'][0]
        );
        $this->assertArrayNotHasKey('leagues', $body);
        $this->assertArrayNotHasKey('name', $event);
    }

    #[Test]
    public function nothing_the_visitor_sends_reaches_espn()
    {
        $this->espn([self::game('401')]);

        [$status] = $this->get('?url='.urlencode('http://169.254.169.254/').'&groups=1&limit=999');

        $this->assertSame(200, $status);
        $this->assertCount(1, $this->sent);
        $this->assertSame(Scoreboard::URL, (string) $this->sent[0]['request']->getUri());
    }

    #[Test]
    public function every_visitor_shares_one_upstream_call()
    {
        $this->espn([self::game('401')]);

        $this->get();
        $this->get('?groups=1');
        [$status, $body] = $this->get();

        $this->assertSame(200, $status);
        $this->assertSame('401', $body['events'][0]['id']);
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
        $this->assertSame('401', $body['events'][0]['id']);
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
}
