<?php
namespace Cechmistrz\Map;

use Cechmistrz\Map\Map;

class Location
{
    private $map;
    private $x;
    private $y;

    public function __construct(Map $map, int $x, int $y)
    {
        $this->map = $map;
        $this->x = $x;
        $this->y = $y;
    }

    public function getMap() : Map
    {
        return $this->map;
    }

    public function getX() : int
    {
        return $this->x;
    }

    public function getY() : int
    {
        return $this->y;
    }
}