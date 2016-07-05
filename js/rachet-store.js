define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dstore/Store',
    'dstore/SimpleQuery',
    'dojox/socket',
    'dojox/socket/Reconnect',
    'dojo/Deferred',
    'dstore/QueryResults'
], function (declare, array, Store, SimpleQuery, Socket, Reconnect, Deferred, QueryResults) {
    return declare([Store, SimpleQuery], {
		socket : null,
		deferrers : null,
		sortBy : null,
		_state : null,
		constructor : function (/*string*/ wsUrl) {
			this.sortBy = [];
			// ACHTUNG!
			// Trackable uses dojo.delegate() in track(), 
			// which means that you cant simply use this.isOpen = false etc. as it is lost in 'delegating'
			// What a mess!
			this._state = {
				messages : [],
				isOpen : false,
				messageId : 0
			};
			this.deferrers = {};
			this.socket = new Reconnect(new Socket({url:wsUrl,error: function(e) {alert(e);}}));
			var storeObj = this;
			this.socket.on('open',function(event) {
				storeObj._state.isOpen = true;
				array.forEach(storeObj._state.messages, function(message) { this.socket.send(message)}, storeObj);
				storeObj._state.messages = null;
			});
			this.socket.on('message', function(event) {
				var answer = JSON.parse(event.data);
				if(answer.command === 'fetchRange') {
					var qs = new QueryResults(answer.data, {totalLength:answer.totalLength});
					storeObj.deferrers[answer._id].data.resolve(qs);
					storeObj.deferrers[answer._id].totalLength.resolve(answer.totalLength);
				} else {
					storeObj.deferrers[answer._id].data.resolve(answer.result);
				}
				delete storeObj.deferrers[answer.id];
			});
		},
		get: function (id) {
			var data = new Deferred();
			this._sendCommand('get', {id : id}, {data:data});
			return data;
		},
		add: function(object) {
			var data = new Deferred();
			this._sendCommand('add', {object : object}, {data:data});
			return data;
		},
		put: function(object) {
			var data = new Deferred();
			this._sendCommand('put', {object : object}, {data:data});
			return data;
		},
		remove: function(id) {
			var data = new Deferred();
			this._sendCommand('remove', {id : id}, {data:data});
			return data;
		},
		fetch: function() {
			alert('fetch');
		},
		fetchRange: function (kwArgs) {
			var data = new Deferred();
			var len = new Deferred();
			kwArgs.sortBy = this.sortBy;
			this._sendCommand('fetchRange', {kwArgs : kwArgs}, {data:data, totalLength:len});
			return new QueryResults(data, {totalLength : len});
	        },
		_sendCommand: function(command, opts, deferrers) {
			opts.command = command;
			opts._id = this._state.messageId++;
			var message = JSON.stringify(opts);
			this.deferrers[opts._id] = deferrers;
			if(!this._state.isOpen) {
				this._state.messages.push(message);
			}
			else {
				this.socket.send(message);
			}
		},
		_createSortQuerier : function(sorted) {
			this.sortBy = sorted;
			return this.inherited(arguments);
		}
	});
});
