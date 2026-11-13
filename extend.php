<?php

use Ernestdefoe\EspnCfbTicker\Api\ScoreboardController;
use Ernestdefoe\EspnCfbTicker\Scoreboard;
use Flarum\Frontend\Document;
use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less')
        // The league boxes come from the server's list, never a copy in the bundle.
        ->content(function (Document $document) {
            $document->payload['espnTickerLeagues'] = array_keys(Scoreboard::LEAGUES);
        }),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Routes('api'))
        ->get('/espn-cfb-ticker/scoreboard', 'ernestdefoe-espn-cfb-ticker.scoreboard', ScoreboardController::class),

    (new Extend\Settings())
        ->default('ernestdefoe-espn-cfb-ticker.enabled', true)
        ->default('ernestdefoe-espn-cfb-ticker.position', 'top')
        ->default('ernestdefoe-espn-cfb-ticker.refreshInterval', 60)
        ->default('ernestdefoe-espn-cfb-ticker.scrollSpeed', 40)
        ->default('ernestdefoe-espn-cfb-ticker.avocado_compat', false)
        ->default('ernestdefoe-espn-cfb-ticker.leagues', Scoreboard::DEFAULT)
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.enabled', 'ernestdefoe-espn-cfb-ticker.enabled', 'boolval')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.position', 'ernestdefoe-espn-cfb-ticker.position')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.refreshInterval', 'ernestdefoe-espn-cfb-ticker.refreshInterval', 'intval')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.scrollSpeed', 'ernestdefoe-espn-cfb-ticker.scrollSpeed', 'intval')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.avocado_compat', 'ernestdefoe-espn-cfb-ticker.avocado_compat', 'boolval')
        ->serializeToForum('ernestdefoe-espn-cfb-ticker.leagues', 'ernestdefoe-espn-cfb-ticker.leagues', Scoreboard::chosen(...)),
];
