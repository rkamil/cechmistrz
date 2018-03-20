<?php
namespace Cechmistrz;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

use Cechmistrz\Player;
use Cechmistrz\PlayerRepositoryInterface;
use Cechmistrz\Map;
use Cechmistrz\MapRepository;

class Game implements MessageComponentInterface
{
    // repozytorium graczy
    protected $playerRepository;

    // repozytorium map
    protected $mapRepository;

    // klienci podłączeni i zidentyfikowani
    protected $accepted;

    public function __construct(PlayerRepositoryInterface $playerRepository, MapRepository $mapRepository)
    {
        $this->playerRepository = $playerRepository;
        $this->mapRepository = $mapRepository;

        $this->accepted = new \SplObjectStorage;
    }

    // po połączeniu gracza
    public function onOpen(ConnectionInterface $conn)
    {
        
    }

    // po akceptacji gracza
    public function onAccept(ConnectionInterface $conn)
    {
        // wysłanie powiadomienia o akceptacji oraz listy graczy
        $this->sendTo($conn, 'initial', ['accepted' => true, 'player'=> $conn->player, 'others' => $this->getOtherPlayers($conn)]);

        // wysłanie informacji do pozostałych graczy o podłączeniu
        $this->broadcastWithout($conn, 'newOther', $conn->player);

        // log w konsoli
        echo "Gracz {$conn->player->nick} połączył się.\n";

        // powiadomienie o zalogowaniu
        $data = [
            'nick' => 'System',
            'message' => 'Gracz ' . $conn->player->nick . ' dołącza do gry.'
        ];

        //$this->broadCastWithout($conn, 'newMessage', $data);
    }

    // po odebraniu wiadomości
    public function onMessage(ConnectionInterface $from, $msg)
    {
        // parsowanie nadchodzącej wiadomości
        $data = json_decode($msg, true);
        $type = $data['type'];
        $data = $data['data'];

        // pakiet inicjujący
        if ($type == 'initial') {
            // utworzenie obiektu gracza i podpięcie go do połączenia

            // czy posiadamy gracza zapisanego?
            $id = $data['id'];

            if ($id !== null && $this->playerRepository->has($id)) {
                // rozłączenie, jeśli już połączony
                $accepted = $this->getAcceptedById($id);
                if ($accepted !== null)
                    $accepted->close();

                $player = $this->playerRepository->get($id);
            } else {
                $id = bin2hex(random_bytes(16));
                $nick = 'Random#' . (rand(1,1000));
                $location = 'Testowa mapa II';
                $x = 3;
                $y = 6;
                $player = new Player($id, $nick, $location, $x, $y);

                $this->playerRepository->save($player);
            }
            
            $from->player = $player;

            // podpięcie zaakceptowanego połączenia
            $this->accepted->attach($from);

            // wywołanie metody 
            $this->onAccept($from);
        }

        // ruch postaci
        if ($type == 'move') {
            $dir = $data['dir'];
            $validDirections = ['left', 'right', 'up', 'down'];

            // czy kierunek ruchu jest poprawny?
            if (!in_array($dir, $validDirections))
                return;

            // obliczenie celu ruchu
            [$targetX, $targetY] = $from->player->getDirectionPosition($dir);

            // wczytanie danych mapy, na której znajduje się dany gracz
            $location = $from->player->location;
            $map = $this->mapRepository->get($location);

            // sprawdzenie czy nie wychodzi gracz poza mapę
            if ($targetX < 0 || $targetY < 0 || $targetX >= $map->width || $targetY >= $map->height)
                return;

            // sprawdzenie kolizji z obiektami mapy
            if (!$map->isWalkable($targetX, $targetY))
                return;

            // wykonanie ruchu
            $moveResult = $from->player->move($dir);

            // powiadomienie o ruchu
            $msg = [
                'player' => $from->player,
                'dir' => $dir
            ];

            // wysłanie do wykonawcy ruchu
            $this->sendTo($from, 'move', $msg);

            // wysłanie do wszystkich innych graczy
            if ($moveResult)
                $this->broadcastWithout($from, 'updateOther', $msg);
        }

        // odebranie wiadomości od gracza
        if ($type == 'newMessage') {
            $nick = $from->player->nick;
            $msg = htmlspecialchars($data['message']);

            $data = [
                'nick' => $nick,
                'message' => $msg
            ];

            // wysłanie do wszystkich graczy
            $this->broadcastAll('newMessage', $data);

            echo "<{$from->player->nick}> {$msg}.\n";
        }

        // przejście przez przejście
        if ($type == 'enterGate') {
            $location = $from->player->location;
            $x = $from->player->x;
            $y = $from->player->y;
            $map = $this->mapRepository->get($location);

            $gateData = $map->getGateAt($x, $y);
            
            if ($gateData != null) {
                $target = $gateData[0];
                $targetX = $gateData[1];
                $targetY = $gateData[2];

                $from->player->location = $target;
                $from->player->x = $targetX;
                $from->player->y = $targetY;

                $data = [
                    'success' => true
                ];

                // wysłanie informacji o przejściu
                $this->sendTo($from, 'enterGate', $data);

                // zakończenie bieżącego połączenia
                $from->close();
            }
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        // czy gracz był zaakceptowany?
        if (!$this->accepted->contains($conn))
            return;

        // zapisanie postępów gracza
        $this->playerRepository->save($conn->player);

        // odłączenie gracza z listy zaakceptowanych
        $this->accepted->detach($conn);

        // wysłanie informacji do innych graczy
        $this->broadcastWithout($conn, 'removeOther', $conn->player);

        echo "Gracz {$conn->player->nick} rozłączył się.\n";

        // powiadomienie o wylogowaniu
        $data = [
            'nick' => 'System',
            'message' => 'Gracz ' . $conn->player->nick . ' opuszcza grę.'
        ];

        //$this->broadCastWithout($conn, 'newMessage', $data);
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "Wystąpił błąd: {$e->getMessage()}.\n";

        $conn->close();
    }

    // wysyłanie danych do klienta
    public function sendTo(ConnectionInterface $target, $type, $data)
    {
        $packet = [
            'type' => $type,
            'data' => $data
        ];

        $msg = json_encode($packet);
        $target->send($msg);
    }

    // broadcast poza jednym klientem
    public function broadcastWithout(ConnectionInterface $target, $type, $data)
    {
        foreach ($this->accepted as $client)
            if ($client !== $target)
                $this->sendTo($client, $type, $data);
    }

    // broadcast do wszystkich klientów
    public function broadcastAll($type, $data)
    {
        foreach ($this->accepted as $client)
            $this->sendTo($client, $type, $data);
    }

    // broadcast do innych na danej mapie
    public function broadcastOthersOnLocation($target, $location, $type, $data) {
        foreach ($this->accepted as $client)
            if ($client->player->location == $location && $client !== $target)
                $this->sendTo($client, $type, $data);
    }

    // pobranie pozostałych klientów
    public function getOtherPlayers(ConnectionInterface $target)
    {
        $players = [];

        foreach ($this->accepted as $client)
            if ($client !== $target)
                array_push($players, $client->player);

        return $players;
    }

    // wyciągnięcie zaakceptowanego gracza po id
    public function getAcceptedById($id)
    {
        foreach ($this->accepted as $client)
            if ($client->player->id === $id)
                return $client;

        return null;
    }
}