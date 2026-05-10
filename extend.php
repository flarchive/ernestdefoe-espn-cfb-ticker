<?php

use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    (new Extend\Settings())
        ->default('ernestdefoe-espn-cfb-ticker.enabled', true)
        ->default('ernestdefoe-espn-cfb-ticker.position', 'top')
        ->default('ernestdefoe-espn-cfb-ticker.refreshInterval', 60)
        ->default('ernestdefoe-espn-cfb-ticker.scrollSpeed', 40)
        ->default('ernestdefoe-espn-cfb-ticker.avocado_compat', false)
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.enabled', 'ernestdefoe-espn-cfb-ticker.enabled', 'boolval')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.position', 'ernestdefoe-espn-cfb-ticker.position')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.refreshInterval', 'ernestdefoe-espn-cfb-ticker.refreshInterval', 'intval')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.scrollSpeed', 'ernestdefoe-espn-cfb-ticker.scrollSpeed', 'intval')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.avocado_compat', 'ernestdefoe-espn-cfb-ticker.avocado_compat', 'boolval'),
];
