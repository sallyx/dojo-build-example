<?php
namespace Rest;

require_once dirname(__DIR__).'/vendor/autoload.php';
require_once dirname(__DIR__).'/MyApp/Chat.php';

use MyApp\Chat;

class Connection implements \Ratchet\ConnectionInterface {
	function send($data) {
		$data = json_decode($data);
		echo json_encode($data->result);
	}

	function close() { }
}

class FetchRangeConnection extends Connection {
	function send($data) {
		$data = json_decode($data);
		echo json_encode((object) array('total' => $data->totalLength, 'items' => $data->data));
	}
}


class RestModel {

	/** @var Chat */
	private $chat;

	public function run() {
		$this->chat = new Chat;
		$getParams = $this->parseGetParams();
		header('Content-Type: application/json');
		switch($_SERVER['REQUEST_METHOD']) {
			case 'GET':
				if(!$getParams->id)
					$this->fetchRange($getParams);
				else 
					$this->get($getParams);
				break;
			case 'POST':
				$this->add($getParams);
				break;
			case 'PUT':
				$this->put($getParams);
				break;
			case 'DELETE':
				$this->remove($getParams);
				break;
		}
	}

	private function parseGetParams() {
		$params = array(
			'id' => null,
			'sort' => array(),
			'limit' =>  (object) array('start' => 0, 'end' => 10),
		);
		foreach($_GET as $param => $_) {
			if($param === 'id') {
				$params['id'] = $_;
				continue;
			}
			preg_match('/([^\\(]+)\\(([^\\)]*)\\)/', $param, $m);
			$vals = explode(',', $m[2]);
			if($m[1] === 'sort') {
				foreach($vals as $v) {
					$sort = (object) array('property' => substr($v,1), 'descending' => false);
					if($v[0] === '-') {
						$sort->descending = true;
					}
					$params['sort'][] = $sort;
				}

			}
			elseif($m[1] === 'limit') {
				if(count($vals) > 1)
					$params['limit'] = (object) array('start' => $vals[1], 'end' => $vals[0]+$vals[1]);
				else
					$params['limit'] = (object) array('start' => 0, 'end' => $vals[0]);
			}
		}
		return (object) $params;
	}

	private function fetchRange($getParams) {
		$start = $getParams->limit->start;
		$end = $getParams->limit->end;
		$sortBy = $getParams->sort;

		$msg = (object) array(
			'_id' => 1,
			'command' => 'fetchRange',
			'kwArgs' => (object) array(
				'start' => $start,
				'end' => $end,
				'sortBy' => $sortBy
			)
		);
		$msg = json_encode($msg);
		$this->chat->onMessage(new FetchRangeConnection, $msg);
	}

	public function get($getParams) {
		$msg = (object) array(
			'_id' => 1,
			'command' => 'get',
			'id' => $getParams->id,
		);
		$msg = json_encode($msg);
		$this->chat->onMessage(new connection, $msg);
	}
	public function add($getParams) {
		$msg = (object) array(
			'_id' => 1,
			'command' => 'put',
			'id' => $getParams->id,
			'object' => json_decode($_PUT)
		);
		$msg = json_encode($msg);
		$this->chat->onMessage(new connection, $msg);
	}
	public function put($getParams) {
		$_PUT = file_get_contents("php://input");
		$msg = (object) array(
			'_id' => 1,
			'command' => 'put',
			'id' => $getParams->id,
			'object' => json_decode($_PUT)
		);
		$msg = json_encode($msg);
		$this->chat->onMessage(new connection, $msg);
	}
	public function remove($getParams) {
		$msg = (object) array(
			'_id' => 1,
			'command' => 'remove',
			'id' => intval($getParams->id)
		);
		$msg = json_encode($msg);
		$this->chat->onMessage(new connection, $msg);
	}
}


$model = new RestModel;
$model->run();
