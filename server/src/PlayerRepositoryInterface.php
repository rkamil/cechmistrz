<?php
namespace Cechmistrz;

interface PlayerRepositoryInterface
{
    public function has($id);
    public function get($id);
    public function save(Player $player);
    public function delete(Player $player);
}