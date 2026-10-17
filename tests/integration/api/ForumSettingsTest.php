<?php

namespace Ernestdefoe\EspnCfbTicker\Tests\integration\api;

use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\Test;

/**
 * The ticker is drawn entirely in the browser from what the forum payload
 * says, so those values, and their types, are the whole server side.
 */
class ForumSettingsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-espn-cfb-ticker');
    }

    private function forum(): array
    {
        return json_decode((string) $this->send($this->request('GET', '/api'))->getBody(), true)['data']['attributes'];
    }

    #[Test]
    public function the_defaults_reach_every_visitor()
    {
        $forum = $this->forum();

        $this->assertTrue($forum['ernestdefoe-espn-cfb-ticker.enabled']);
        $this->assertSame('top', $forum['ernestdefoe-espn-cfb-ticker.position']);
        $this->assertSame(60, $forum['ernestdefoe-espn-cfb-ticker.refreshInterval']);
        $this->assertSame(40, $forum['ernestdefoe-espn-cfb-ticker.scrollSpeed']);
        $this->assertFalse($forum['ernestdefoe-espn-cfb-ticker.avocado_compat']);
    }

    #[Test]
    public function the_settings_arrive_with_the_right_types()
    {
        $this->setting('ernestdefoe-espn-cfb-ticker.enabled', '0');
        $this->setting('ernestdefoe-espn-cfb-ticker.position', 'bottom');
        $this->setting('ernestdefoe-espn-cfb-ticker.refreshInterval', '120');
        $this->setting('ernestdefoe-espn-cfb-ticker.scrollSpeed', '25');
        $this->setting('ernestdefoe-espn-cfb-ticker.avocado_compat', '1');

        $forum = $this->forum();

        $this->assertFalse($forum['ernestdefoe-espn-cfb-ticker.enabled'], 'The string "0" must not read as switched on');
        $this->assertSame('bottom', $forum['ernestdefoe-espn-cfb-ticker.position']);
        $this->assertSame(120, $forum['ernestdefoe-espn-cfb-ticker.refreshInterval']);
        $this->assertSame(25, $forum['ernestdefoe-espn-cfb-ticker.scrollSpeed']);
        $this->assertTrue($forum['ernestdefoe-espn-cfb-ticker.avocado_compat']);
    }
}
