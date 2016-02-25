<?php

namespace App\Library;

use Ephp\SocketIOClient;

class SocketIO
{

    public $client = null;

    public function __construct()
    {
        $this->client = new SocketIOClient('localhost:1337');
        $this->client->connect();
    }

    public function __destruct()
    {
        $this->client->disconnect();
    }

    public function emit($event = 'php_announce', $content = [])
    {
        $this->client->emit($event, $content);
    }

    public function message($message)
    {
        $this->emit('php_announce', [
            'message' => $message
        ]);
    }
}
