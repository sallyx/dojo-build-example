define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dstore/Store',
    'dojox/socket',
    'dojox/socket/Reconnect',
    'dojo/Deferred',
    'dstore/QueryResults'
], function (declare, array, Store, Socket, Reconnect, Deferred, QueryResults) {
    return declare(Store, {
		socket : null,
		deferrers : null,
		isOpen: false,
		messageId : 1,
		sortBy : [],
		constructor : function (/*string*/ wsUrl) {
			this.messages = [];
			this.deferrers = {};
			this.socket = new Reconnect(new Socket({url:wsUrl,error: function(e) {alert(e);}}));
			var storeObj = this;
			this.socket.on('open',function(event) {
				storeObj.isOpen = true;
				array.forEach(storeObj.messages, function(message) { this.socket.send(message)}, storeObj);
				storeObj.messages = [];
			});
			this.socket.on('message', function(event) {
				var answer = JSON.parse(event.data);
				var qs = new QueryResults(answer.data, {totalLength:answer.totalLength});
				storeObj.deferrers[answer.id].data.resolve(qs);
				storeObj.deferrers[answer.id].totalLength.resolve(answer.totalLength);
				delete storeObj.deferrers[answer.id];
			});
		},
		get: function (id) {
			return {id:id};
		},
		add: function(object) {
		},
		put: function(object) {
		},
		remove: function(id) {
		},
		_createSortQuerier : function(sorted) {
			this.sortBy = sorted;
		},
		fetch: function() {
			return new QueryResults([]);
		},
		fetchRange: function (kwArgs) {
			kwArgs.sortBy = this.sortBy;
			var data = new Deferred();
			var len = new Deferred();
			var id = this.messageId++;
			this.deferrers[id] = {data:data, totalLength:len};
			var message = JSON.stringify({command: 'fetchRange', id : id, kwArgs : kwArgs});
			if(!this.isOpen) {
				this.messages.push(message);
			}
			else {
				this.socket.send(message);
			}
			return new QueryResults(data, {totalLength : len});
			
	        }
	});
});
