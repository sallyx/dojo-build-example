require([
		'dojo/_base/declare',
		'dojo/on',
		"dojox/socket", 
		"dojo/dom", 
		'dstore/Memory', 
		"dstore/Trackable",
		'dgrid/Grid', 
		'dgrid/extensions/Pagination',
		"dojo/domReady!"
    ],
    function(declare, on, Socket, dom, Memory, Trackable, Grid, Pagination) {
	var data = [];
	for(var i = 1; i < 49; i++) {
		data.push({id: i, name: 'id '+i, value: Math.floor(Math.random()*1000)});
	}
	var Store = declare([Memory, Trackable]);
	var myStore = new Store({data:data, idProperty:'id'});

	var MyGrid = declare([Grid, Pagination]);
	var grid = new MyGrid({
        	collection: myStore,
	        columns: {
        	    id: 'Id',
	            name: 'Name',
	            value: 'Random value'
	        },
		className: "dgrid-autoheight",
		loadingMessage: 'Loading data...',
		noDataMessage: 'No results found.',
		rowsPerPage: 25,
		minRowsPerPage: 50
	}, 'container');
	grid.startup();

	on(dom.byId('button'),'click', function(e) {
		var item = {'id':1, name: 'id 1', value: Math.floor(Math.random()*1000)};
		myStore.put(item);
	});

	var socket = new Socket('ws://localhost:8080');
	socket.on('open', function(event) {
		alert('connected');
		socket.send("Hello world!");
	});
	socket.on('message', function(event) {
		alert('Socket got message: '+event.data);
	});
    }
); 

