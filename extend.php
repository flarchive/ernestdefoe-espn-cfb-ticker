<?php

namespace YourVendor\EspnCfbTicker;

use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\Settings())
        ->serializeToForum('espnCfbTicker.enabled', 'espn_cfb_ticker.enabled', 'boolval', true)
        ->serializeToForum('espnCfbTicker.speed', 'espn_cfb_ticker.speed', 'intval', 40)
        ->serializeToForum('espnCfbTicker.refreshInterval', 'espn_cfb_ticker.refresh_interval', 'intval', 60)
        ->serializeToForum('espnCfbTicker.position', 'espn_cfb_ticker.position', 'strval', 'top')
        ->serializeToForum('espnCfbTicker.showLogos', 'espn_cfb_ticker.show_logos', 'boolval', true),

    (new Extend\Routes('api'))
        ->get('/espn-cfb-ticker', 'espnCfbTicker.scores', Api\Controller\GetScoresController::class),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),
];
