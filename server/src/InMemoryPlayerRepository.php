<?php
namespace Cechmistrz;

class InMemoryPlayerRepository implements PlayerRepositoryInterface
{
    private $players;

    public function __construct()
    {
        $this->players = [];
    }

    // pobranie gracza po ID
    public function get($id)
    {
        if (!$this->has($id))
            return null;

        return $this->players[$id];
    }

    // zapisanie gracza
    public function save(Player $player)
    {
        $id = $player->id;

        $this->players[$id] = $player;
    }

    // usunięcie gracza
    public function delete(Player $player)
    {
        if (!$this->has($id))
            return null;

        unset($this->players[$id]);
    }

    // czy gracz o takim id istnieje?
    public function has($id)
    {
        return array_key_exists($id, $this->players);
    }

}