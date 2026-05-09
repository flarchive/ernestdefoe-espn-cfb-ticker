<?php

use Flarum\Extend;
use Ernestdefoe\EspnCfbTicker\Listener\AddTickerData;

return [
    // Register frontend assets
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    // Register locale files
    new Extend\Locales(__DIR__ . '/locale'),

    // Register admin settings
    (new Extend\Settings())
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.refreshInterval', 'ernestdefoe-espn-cfb-ticker.refreshInterval', 'intval', 60)
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.scrollSpeed', 'ernestdefoe-espn-cfb-ticker.scrollSpeed', 'intval', 40)
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.enabled', 'ernestdefoe-espn-cfb-ticker.enabled', 'boolval', true)
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.position', 'ernestdefoe-espn-cfb-ticker.position', null, 'top'),
];
