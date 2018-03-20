<?php
namespace Cechmistrz;

class Map implements \JsonSerializable
{
    private $objectData;

    public $name;
    public $width;
    public $height;
    public $ground;
    public $objects;
    public $gates;

    public function __construct($data, $objectData)
    {
        $this->name = $data['name'];
        $this->width = $data['width'];
        $this->height = $data['height'];
        $this->ground = $data['ground'];
        $this->objects = $data['objects'];
        $this->gates = $data['gates'];

        $this->objectData = $objectData;
    }

    public static function fromFile($filename, $objectData)
    {
        $json = file_get_contents($filename);
        $mapData = json_decode($json, true);
        $map = new self($mapData, $objectData);

        return $map;
    }

    public function isWalkable($x, $y)
    {
        $index = $y * $this->width + $x;
        $objectId = $this->objects[$index];

        if ($objectId == 0)
            return true;

        if ($this->objectData[$objectId]['collidable'])
            return false;

        return true;
    }

    public function getGateAt($x, $y)
    {
        for ($i = 0; $i < count($this->gates); $i++) {
            [$mapX, $mapY, $target, $targetX, $targetY] = $this->gates[$i];

            if ($mapX == $x && $mapY == $y)
                return [$target, $targetX, $targetY];
        }

        return null;
    }

    public function jsonSerialize()
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
}