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
	options: null,
	constructor: function(options) {
		this.deferrers = {};
		this.sortBy = [];
		this.options = options;
		this._state = {
			messages:  [],
			isOpen:    false,
			messageId: 1,
			wsUrl:     options.wsUrl
		};
	},
	connect: function () {
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
		var timeout = setTimeout(lang.hitch(this, function() {
			if(this.socket.readyState == this.socket.OPEN) {
				return;
			}
			this.socket.close();
			this.emit('status-change',{status:'timeout', message:'Socket connection timeout'});
		}), this.options.timeout || 10000);

		this.socket.on('open', lang.hitch(this, function(event) {
			clearTimeout(timeout);
			if(this.socket.readyState != this.socket.OPEN) {
				return;
			}
			this._state.isOpen = true;
			array.forEach(this._state.messages, function(message) { 
				this.socket.send(message)
			}, this);
			this._state.messages = null;
			this.emit('status-change',{status: 'open', message:'Socket connection opened'});
		}));
		this.socket.on('close', lang.hitch(this, function(event) {
			this.emit('status-change',{status: 'close', message:'Socket connection closed'});
		}));
		this.socket.on('message', lang.hitch(this, function(event) {
			var answer = JSON.parse(event.data);
			if(answer._id) {
				this._resolveDeferrers(answer);
			} else {
				this._notifyChange(answer);
			}
		}));
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
	_xstore : null,
	options: null,
	constructor : function (options) {
		this.options = options;
		this._xstore = {};
	},
	// unfortunatery dgrid makes copy of store so properties must be stored as references
	getStore: function() {
		return this._xstore.store;
	},
	connect: function() {
		this._xstore.store = new wsStore(this.options);
		this.propagateEvents();

		this.getStore().on('status-change', lang.hitch(this, function(event) {
			if(event.status !== 'close' && event.status !== 'error') {
				return;
			}
			var deferrers  = this.getStore().deferrers;
			this.getStore()._state.messages = null;
			var myRest = declare([Rest, SimpleQuery]);
			this._xstore.store = new myRest({target: this.options.restUrl});
			this.propagateEvents();
			if(deferrers) {
				for(var _id in deferrers) {
					var d = deferrers[_id];
					var opts = d.opts;
					var def = this.getStore()[opts.command].apply(this.getStore(), opts.args);
					(function(d,def) {
						def.then(function(data) {
							d.data.resolve(data);
							if(d.totalLength && data.totalLength) {
								data.totalLength.then(function(tl) {
									d.totalLength.resolve(tl);
								});
							}
						});
					})(d,def);
				}
			}
			// emit after last 'Socket connection closed'
			setTimeout(lang.hitch(this,function() {this.emit('status-change', {status:'fallback', message: 'Store fallback to REST'}); }), 10);
		}));
		this.getStore().connect();
	},
	propagateEvents: function() {
		var my = this;
		var eventTypes = {add: 1, update: 1, 'delete': 1, 'status-change': 1};
		for (var type in eventTypes) {
			this.getStore().on(type, (function(type) {
				return function(event) {
					my.emit(type, event);
				};
			})(type));
		}
	},
	get: function (id) {
		return this.getStore().get(id);
	},
	add: function(object) {
		return this.getStore().add(object);
	},
	put: function(object) {
		return this.getStore().put(object);
	},
	remove: function(id) {
		return this.getStore().remove(id);
	},
	fetch: function() {
		return this.getStore().fetch();
	},
	fetchRange: function (kwArgs) {
		this.getStore().queryLog = this.queryLog;
		return this.getStore().fetchRange(kwArgs);
	},
	_createFilterQuerier: function (filter) {
		return this.getStore()._createFilterQuerier(filter);
	},
	_getFilterComparator: function (type) {
		return this.getStore()._getFilterComparator(type);
	},
	_createSelectQuerier: function (properties) {
		return this.getStore()._createSelectQuerier(properties);
	},
	_createSortQuerier : function(sorted) {
		return this.getStore()._createSortQuerier(sorted);
	},
	sort: function() {
		return this.inherited(arguments);
	}
    });
});
