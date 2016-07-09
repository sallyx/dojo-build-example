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
		constructor : function (options) {
			this.sortBy = [];
			// ACHTUNG!
			// Trackable uses dojo.delegate() in track(), 
			// which means that you cant simply use this.isOpen = false etc. as it is lost in 'delegating'
			// What a mess!
			this._state = {
				messages:  [],
				isOpen:    false,
				messageId: 1,
				wsUrl:     options.wsUrl,
				data:      []
			};
			this.deferrers = {};
		},
		postscript: function () {
			this.inherited(arguments);
			this.socket =new Socket({url:this._state.wsUrl,error: function(e) {alert(e);}});
			this.socket = new Reconnect(this.socket, { reconnectTime:1000});
			var storeObj = this;
			this.socket.on('open',function(event) {
				storeObj._state.isOpen = true;
				array.forEach(storeObj._state.messages, function(message) { this.socket.send(message)}, storeObj);
				storeObj._state.messages = null;
			});
			collection = this;
			this.socket.on('message', function(event) {
				var answer = JSON.parse(event.data);
				if(answer._id) {
					storeObj._resolveDeferrers(answer);
				} else {
					storeObj._notifyChange(answer);
				}
			});
		},
		_resolveDeferrers(answer) {
			if(answer.command === 'fetchRange') {
				this.deferrers[answer._id].data.resolve(answer.data);
				this.deferrers[answer._id].totalLength.resolve(answer.totalLength);
			} else {
				this.deferrers[answer._id].data.resolve(answer.result);
			}
			delete this.deferrers[answer._id];
		},
		_notifyChange(answer) {
			var type = answer.command;
			if(answer.command === 'remove') {
				type = 'delete';
				this.emit(type, {id: answer.result});
				return;
			}
			if(answer.command === 'put') {
				type = 'update';
			}
			this.emit(type, {target: answer.result});
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
			alert('fetch not implemented yet');
		},
		fetchRange: function (kwArgs) {
			var data = new Deferred();
			var len = new Deferred();
			kwArgs.sortBy = this.sortBy;
			this._sendCommand('fetchRange', {kwArgs : kwArgs}, {data:data, totalLength:len});
			var qr = new QueryResults(data);
			qr.totalLength  = len;
			return qr;
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
