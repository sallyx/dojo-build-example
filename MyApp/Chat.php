<?php
namespace MyApp;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface {

    private $sequence = 0;
    private $clients;
    private $data = array();

    public function __construct() {
        $this->clients = new \SplObjectStorage;
	for($i = 1; $i < rand(100,1000); $i++) {
		$this->data[] = (object) array('id' => $i, 'name' => 'Name '.$i, 'value' => rand(0,500));
	}
	$this->sequence = $i;
    }

    public static function sortBy($a, $b, array $sortBy) {
	    foreach($sortBy as $sortRule) {
		    $res = 0;
		    $prop = $sortRule->property;
		    switch($prop) {
			    case 'id':
				$res = $a->id - $b->id;
				break;
			    default:
				$res = strnatcasecmp($a->$prop, $b->$prop);

		    }
		    if($sortRule->descending)
			    $res *= -1;
		    if($res !== 0)
		    	return $res;
	    }
	    return 0;
    }

    public function onOpen(ConnectionInterface $conn) {
        // Store the new connection to send messages to later
        $this->clients->attach($conn);
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {

	$command = json_decode($msg);
	switch($command->command) {
		case 'fetchRange':
			$answer = $this->fetchRange($command);
			break;
		case 'remove':
			$answer = $this->remove($command);
			break;
		case 'get':
			$answer = $this->get($command);
			break;
		case 'put':
			$answer = $this->put($command);
			break;
		case 'add':
			$answer = $this->add($command);
			break;
	}

	$from->send(json_encode($answer));
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

    public function fetchRange($command) {
	if(!empty($command->kwArgs->sortBy)) {
		$sortBy = $command->kwArgs->sortBy;
		usort($this->data, function ($a, $b) use ($sortBy) {
			return Chat::sortBy($a, $b, $sortBy);
		});
	}
	$start = $command->kwArgs->start;
	$end = $command->kwArgs->end;
	$answer = (object) array(
		'_id' => $command->_id,
		'command' => $command->command,
		'data' => array_slice($this->data, $start, $end-$start),
		'totalLength' => count($this->data)
	);
	return $answer;
    }

    public function remove($command) {
	$this->data = array_filter($this->data, function($a) use($command) { return $command->id !== $a->id;});
	$answer = (object) array(
		'_id' => $command->_id,
		'command' => $command->command,
		'result' => true
    	);
	return $answer;
    }

    public function get($command) {
	$answer = (object) array(
		'_id' => $command->_id,
		'command' => $command->command,
		'result' => (object) array()
    	);
	foreach($this->data as $o) {
		if($o->id == $command->id) {
			$answer->result = $o;
			break;
		}
	}
	return $answer;
    }
    public function put($command) {
	$answer = (object) array(
		'_id' => $command->_id,
		'command' => $command->command,
		'result' => true
    	);
	foreach($this->data as $i =>$o) {
		if($o->id == $command->object->id) {
			$this->data[$i] = $command->object;
			break;
		}
	}
	return $answer;
    }

    public function add($command) {
	$answer = (object) array(
		'_id' => $command->_id,
		'command' => $command->command,
		'result' => null
    	);
	$o = $command->object;
	$o->id = $this->sequence++;
	$this->data[]= $o;
	$answer->result = $o;
	return $answer;
    }
}
