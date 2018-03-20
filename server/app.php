<?php
require 'vendor/autoload.php';

use Psr\Http\Message\ServerRequestInterface as Request;
use React\EventLoop\Factory as EventLoop;
use React\Socket\Server as Socket;
use React\Http\Server;
use React\Http\Response;

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

use Cechmistrz\Game;
use Cechmistrz\Map;
use Cechmistrz\MapRepository;
use Cechmistrz\InMemoryPlayerRepository;




// --------
// DANE GRY
// --------

// utworzenie repozytorium z mapami
$mapRepository = new MapRepository();


// dodanie map
$objects = file_get_contents('data/objects.json');
$objects = json_decode($objects, true);

$map = Map::fromFile('data/testmap.map.json', $objects);
$map2 = Map::fromFile('data/testmap2.map.json', $objects);

$mapRepository->add($map);
$mapRepository->add($map2);


// utworzenie repozytorium graczy
$playerRepository = new InMemoryPlayerRepository();

// utworzenie instancji gry
$game = new Game($playerRepository, $mapRepository);




// -------
// FUNKCJE
// -------
$httpServe = function (Request $request) use ($mapRepository) {
    $params = $request->getQueryParams();

    if (isset($params['map'])) {
        $map = $mapRepository->get($params['map']);
        $json = json_encode($map);
    } else {
        $json = json_encode(null);
    }

    return new Response(200, ['Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*'], $json);
};




// -----------------
// PĘTLA ZDARZENIOWA
// -----------------

// utworzenie głównej pętli zdarzeniowej
$loop = EventLoop::create();

// utworzenie serwera WS
$wsSocket = new Socket(9344, $loop);
$components = new HttpServer(new WsServer($game));

$wsServer = new IoServer($components, $wsSocket, $loop);

// utworzenie serwera HTTP
$httpSocket = new Socket(1444, $loop);
$server = new Server($httpServe);

$server->listen($httpSocket);

// uruchomienie pętli
$loop->run();
