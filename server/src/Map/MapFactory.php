<?php
namespace Cechmistrz\Map;

use Cechmistrz\Map\Map;

class MapFactory
{
    private $objectData;

    public function __construct(array $objectData)
    {
        $this->objectData = $objectData;
    }

    // tworzy instancję mapy z pliku .json
    public function createFromFile(string $fileName)
    {
        $json = file_get_contents($fileName);
        $mapData = json_decode($json, true);
        $map = new Map($mapData, $objectData);

        return $map;
    }
}