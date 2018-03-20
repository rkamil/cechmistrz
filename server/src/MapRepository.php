<?php
namespace Cechmistrz;

use Cechmistrz\Map;

class MapRepository
{
    private $maps;

    public function __construct()
    {
        $this->maps = [];
    }

    public function add(Map $map)
    {
        $name = $map->name;

        $this->maps[$name] = $map;
    }

    public function getAll()
    {
        return $this->maps;
    }

    public function get($name)
    {
        if ($this->has($name))
            return $this->maps[$name];

        return null;
    }

    public function has($name)
    {
        return array_key_exists($name, $this->maps);
    }
}