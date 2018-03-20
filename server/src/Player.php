<?php
namespace Cechmistrz;

class Player implements \JsonSerializable
{
    // dostępne z zewnątrz
    public $id;
    public $nick;
    public $location;
    public $x;
    public $y;
    public $dir;

    // niedostępne z zewnątrz
    private $lastMove;

    public function __construct($id, $nick, $location, $x, $y)
    {
        $this->id = $id;
        $this->nick = $nick;
        $this->location = $location;
        $this->x = $x;
        $this->y = $y;

        $this->lastMove = null;
    }

    public function jsonSerialize()
    {
        return [
            'id' => $this->id,
            'nick' => $this->nick,
            'location' => $this->location,
            'x' => $this->x,
            'y' => $this->y
        ];
    }

    // czy gracz może już wykonać ruch?
    public function canMove()
    {
        if ($this->lastMove === null) {
            return true;
        }

        $acceptedMoveSpeed = 175;
        $current = microtime(true) * 1000;
        $elapsed = $current - $this->lastMove;

        if ($elapsed >= $acceptedMoveSpeed)
            return true;

        return false;
    }

    // pobranie pozycji kierunku gracza
    public function getDirectionPosition($dir)
    {
        $position = [$this->x, $this->y];

        if ($dir == 'left')
            $position[0]--;
        if ($dir == 'right')
            $position[0]++;
        if ($dir == 'up')
            $position[1]--;
        if ($dir == 'down')
            $position[1]++;

        return $position;
    }

    // wykonanie ruchu
    public function move($dir)
    {
        // czy już można się poruszyć?
        if (!$this->canMove())
            return false;

        // ustawienie czasu ostatniego ruchu
        $current = microtime(true) * 1000;
        $this->lastMove = $current;

        // sprawdzanie kolizji, itd...

        // wykonanie ruchu
        [$x, $y] = $this->getDirectionPosition($dir);

        $this->x = $x;
        $this->y = $y;

        return true;
    }
}