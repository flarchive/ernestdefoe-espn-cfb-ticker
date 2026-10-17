<?php

namespace Ernestdefoe\EspnCfbTicker\Api;

use Ernestdefoe\EspnCfbTicker\Scoreboard;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** GET /espn-cfb-ticker/scoreboard, open to guests: the bar shows to them too. Takes no parameters. */
class ScoreboardController implements RequestHandlerInterface
{
    public function __construct(private Scoreboard $scoreboard)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $data = $this->scoreboard->get();

        if ($data === null) {
            return new JsonResponse(['errors' => [['status' => '502', 'code' => 'scores_unavailable']]], 502);
        }

        return new JsonResponse($data);
    }
}
