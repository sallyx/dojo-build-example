<?php
namespace MyApp;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface {

    private $clients;
    private $data = array();

    public function __construct() {
        $this->clients = new \SplObjectStorage;
	for($i = 1; $i < rand(100,1000); $i++) {
		$this->data[] = (object) array('id' => $i, 'name' => 'Name '.$i, 'value' => rand(0,500));
	}
    }

    public function onOpen(ConnectionInterface $conn) {
        // Store the new connection to send messages to later
        $this->clients->attach($conn);
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {

	$command = json_decode($msg);
	var_dump($command);
	if($command->command === 'fetchRange') {
		$start = $command->kwArgs->start;
		$end = $command->kwArgs->end;
		$answer = (object) array(
			'id' => $command->id,
			'data' => array_slice($this->data, $start, $end-$start),
			'totalLength' => count($this->data)
	    	);
		$from->send(json_encode($answer));
	}

        foreach ($this->clients as $client) { }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
}
