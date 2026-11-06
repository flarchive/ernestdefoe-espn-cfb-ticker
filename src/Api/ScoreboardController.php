<?php

namespace Ernestdefoe\EspnCfbTicker\Api;

use Ernestdefoe\EspnCfbTicker\Scoreboard;
use Flarum\Settings\SettingsRepositoryInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * GET /espn-cfb-ticker/scoreboard, open to guests: the bar shows to them too.
 * Takes no parameters: the leagues are the admin's choice.
 */
class ScoreboardController implements RequestHandlerInterface
{
    public function __construct(private Scoreboard $scoreboard, private SettingsRepositoryInterface $settings)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $leagues = $this->scoreboard->get(Scoreboard::chosen($this->settings->get('ernestdefoe-espn-cfb-ticker.leagues')));

        if ($leagues === null) {
            return new JsonResponse(['errors' => [['status' => '502', 'code' => 'scores_unavailable']]], 502);
        }

        return new JsonResponse(['leagues' => $leagues]);
    }
}
