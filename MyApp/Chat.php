<?php
namespace MyApp;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface {

    private $sequence = 0;
    private $clients;
    private $file;
    private $data = array();

    public function __construct() {
	$this->file = dirname(__DIR__).'/db/data.json';
        $this->clients = new \SplObjectStorage;
	$this->setupData();
    }

    private function  setupData() {
	$data = @file_get_contents($this->file);
	if($data) {
		$this->data = json_decode($data);
		foreach($this->data as $o) {
			$this->sequence = max($this->sequence, $o->id);
		}
		return;
	}
	for($i = 1; $i < rand(100,1000); $i++) {
		$this->data[] = (object) array('id' => $i, 'name' => 'Name '.$i, 'value' => rand(0,500),'updated'=>time(),'removed'=>0);
	}
	$this->sequence = --$i;
	$this->saveData();
    }

    private function saveData() {
	return file_put_contents($this->file, json_encode($this->data));
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
    }

    public function onMessage(ConnectionInterface $from, $msg) {
	$this->setupData(); //read external changes

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
	$answer->_id = null;
	if(in_array($command->command, ['put','add','remove'])) {
		$this->saveData();
		foreach ($this->clients as $id => $client) {
			if($client == $from) continue;
			$client->send(json_encode($answer));
		}
	}
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
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
		'data' => array_slice(array_filter($this->data,function($a) { return !$a->removed;}), $start, $end-$start),
		'totalLength' => count($this->data)
	);
	return $answer;
    }

    public function remove($command) {
	    $this->data = array_map(function($a) use($command) { 
		    if($command->id === $a->id) {
			    $a->removed = 1;
			    $a->updated = time();
		    } 
		    return $a;

	    }, $this->data);
	$answer = (object) array(
		'_id' => $command->_id,
		'command' => $command->command,
		'result' => $command->id
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
		if($o->id == $command->id && !$o->removed) {
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
		'result' => null
    	);
	foreach($this->data as $i =>$o) {
		if($o->id == $command->object->id) {
			$this->data[$i] = $command->object;
			$this->data[$i]->updated = time();
			break;
		}
	}
	$answer->result = $command->object;
	return $answer;
    }

    public function add($command) {
	$answer = (object) array(
		'_id' => $command->_id,
		'command' => $command->command,
		'result' => null
    	);
	$o = $command->object;
	$o->id = ++$this->sequence;
	$o->updated = time();
	$o->removed = 0;
	$this->data[]= $o;
	$answer->result = $o;
	return $answer;
    }
}
