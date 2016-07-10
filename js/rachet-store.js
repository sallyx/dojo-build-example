define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dstore/Store',
    'dstore/SimpleQuery',
    'dstore/Rest',
    'dojox/socket',
    "dojo/_base/xhr",
    'dojo/Deferred',
    'dstore/QueryResults',
    'dojo/Evented',
    'dojo/on',
    "dojo/_base/lang"
], function (declare, array, Store, SimpleQuery, Rest, Socket, xhr, Deferred, QueryResults, Evented, on, lang) {

    var wsStore = declare([Store, SimpleQuery], {
	socket : null,
	sortBy : null,
	_state : null,
	deferrers : null,
	constructor: function(options) {
		this.deferrers = {};
		this.sortBy = [];
		this._state = {
			messages:  [],
			isOpen:    false,
			messageId: 1,
			wsUrl:     options.wsUrl
		};
	},
	connect: function () {
		var storeObj = this;
		var socketOptions = {
			url:this._state.wsUrl,
			error: lang.hitch(this, this._socketError),
			transport: function(args) { // do not use comet style messaging
				var deferrer = new Deferred();
				deferrer.reject("Commet style messaging not supported");
				return deferrer;
			}
		};
		this.socket = new Socket(socketOptions);
		this.socket.on('open',function(event) {
			storeObj._state.isOpen = true;
			array.forEach(storeObj._state.messages, function(message) { this.socket.send(message)}, storeObj);
			storeObj._state.messages = null;
			storeObj.emit('status-change',{status: 'open', message:'Socket connection opened'});
		});
		this.socket.on('close', function(event) {
			storeObj.emit('status-change',{status: 'close', message:'Socket connection closed'});
		});
		this.socket.on('message', function(event) {
			var answer = JSON.parse(event.data);
			if(answer._id) {
				storeObj._resolveDeferrers(answer);
			} else {
				storeObj._notifyChange(answer);
			}
		});
	},
	_socketError:function(event) {
		this.emit('status-change',{status: 'error', message:'Socket connection error'});
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
		this._sendCommand('get', arguments, {id : id}, {data:data});
		return data;
	},
	add: function(object) {
		var data = new Deferred();
		this._sendCommand('add', arguments, {object : object}, {data:data});
		return data;
	},
	put: function(object) {
		var data = new Deferred();
		this._sendCommand('put', arguments, {object : object}, {data:data});
		return data;
	},
	remove: function(id) {
		var data = new Deferred();
		this._sendCommand('remove', arguments, {id : id}, {data:data});
		return data;
	},
	fetch: function() {
		alert('fetch not implemented yet');
	},
	fetchRange: function (kwArgs) {
		var sortBy = [];
		kwArgs.sortBy = [];
		for(var ix in this.queryLog) {
			if(this.queryLog[ix].type == 'sort') {
				if(this.queryLog[ix].normalizedArguments.length) {
					kwArgs.sortBy = this.queryLog[ix].normalizedArguments.pop();
				} else if (this.queryLog[ix].arguments) {
					kwArgs.sortBy = this.queryLog[ix].arguments.pop();
				}
			}
		}
		if(!kwArgs.sortBy)
			kwArgs.sortBy = this.sortBy;
		this.sortBy = kwArgs.sortBy;
		var data = new Deferred();
		var len = new Deferred();
		this._sendCommand('fetchRange', arguments, {kwArgs : kwArgs}, {data:data, totalLength:len});
		var qr = new QueryResults(data);
		qr.totalLength  = len;
		return qr;
	},
	_sendCommand: function(command, args, opts, deferrers) {
		opts.command = command;
		opts._id = this._state.messageId++;
		opts.args = args;
		var message = JSON.stringify(opts);
		deferrers.opts = opts;
		this.deferrers[opts._id] = deferrers;
		if(!this._state.isOpen) {
			this._state.messages.push(message);
		}
		else {
			this.socket.send(message);
		}
	}
    });

    return declare([Store], {
	store : null,
	options: null,
	constructor : function (options) {
		this.options = options;
	},
	connect: function() {
		this.store = new wsStore(this.options);
		this.propagateEvents();
		this.store.on('status-change', lang.hitch(this, function(event) {
			if(event.status !== 'close' && event.status !== 'error') {
				return;
			}
			var deferrers  = this.store.deferrers;
			var myRest = declare([Rest]);
			this.store = new myRest({target: this.options.restUrl});
			this.propagateEvents();
			this.emit('status-change', {status:'fallback', message: 'Store fallback to REST'});
			if(deferrers) {
				for(var _id in deferrers) {
					var d = deferrers[_id];
					var opts = d.opts;
					this.store[opts.command].apply(this.store, opts.args);
				}
			}
		}));
		this.store.connect();
	},
	propagateEvents: function() {
		var my = this;
		var eventTypes = {add: 1, update: 1, 'delete': 1, 'status-change': 1};
		for (var type in eventTypes) {
			this.store.on(type, (function(type) {
				return function(event) {
					my.emit(type, event);
				};
			})(type));
		}
	},
	get: function (id) {
		return this.store.get(id);
	},
	add: function(object) {
		return this.store.add(object);
	},
	put: function(object) {
		return this.store.put(object);
	},
	remove: function(id) {
		return this.store.remove(id);
	},
	fetch: function() {
		return this.store.fetch();
	},
	fetchRange: function (kwArgs) {
		this.store.queryLog = this.queryLog;
		return this.store.fetchRange(kwArgs);
	},
	_createFilterQuerier: function (filter) {
		return this.store._createFilterQuerier(filter);
	},
	_getFilterComparator: function (type) {
		return this.store._getFilterComparator(type);
	},
	_createSelectQuerier: function (properties) {
		return this.store._createSelectQuerier(properties);
	},
	_createSortQuerier : function(sorted) {
		return this.store._createSortQuerier(sorted);
	},
	sort: function() {
		return this.inherited(arguments);
	}
    });
});
