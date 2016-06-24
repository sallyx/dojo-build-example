<?php
require dirname(__DIR__) . '/vendor/autoload.php';
require dirname(__DIR__) . '/MyApp/Chat.php';

use Ratchet\Server\IoServer;
use MyApp\Chat;

$server = IoServer::factory(
        new Chat(),
        8080
);

$server->run();
