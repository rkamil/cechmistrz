<?php
namespace Cechmistrz\Map;

class Map implements \JsonSerializable
{
    private $objectData;

    private $name;
    private $width;
    private $height;
    private $ground;
    private $objects;
    private $gates;

    public function __construct(array $data, array $objectData)
    {
        $this->name = $data['name'];
        $this->width = $data['width'];
        $this->height = $data['height'];
        $this->ground = $data['ground'];
        $this->objects = $data['objects'];
        $this->gates = $data['gates'];

        $this->objectData = $objectData;
    }

    // czy dwie mapy są identyczne?
    public function equals(Map $otherMap) : bool
    {
        $data = $otherMap->getData();
        $name = $data['name'];

        return $this->name === $name;
    }

    // czy na dane pole można wejść?
    public function isWalkable(int $x, int $y) : bool
    {
        $index = $y * $this->width + $x;
        $objectId = $this->objects[$index];

        if ($objectId == 0)
            return true;

        if ($this->objectData[$objectId]['collidable'])
            return false;

        return true;
    }

    // sprawdzenie czy na danym polu jest przejście
    public function getGateAt(int $x, int $y) : ?array
    {
        for ($i = 0; $i < count($this->gates); $i++) {
            [$mapX, $mapY, $target, $targetX, $targetY] = $this->gates[$i];

            if ($mapX == $x && $mapY == $y)
                return [$target, $targetX, $targetY];
        }

        return null;
    }

    // zwraca dane mapy
    public function getData() : array
    {
        return [
            'name' => $this->name,
            'width' => $this->width,
            'height' => $this->height,
            'ground' => $this->ground,
            'objects' => $this->objects,
            'gates' => $this->gates
        ];
    }

    public function jsonSerialize() : array
    {
        return $this->getData();
    }
}