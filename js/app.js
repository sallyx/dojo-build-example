require([
		'dojo/_base/declare',
		'dojo/on',
		"dojo/dom", 
		'rachet-store', 
		"dstore/Trackable",
		'dgrid/Grid', 
		'dgrid/extensions/Pagination',
		'dojo/domReady!'
    ],
    function(declare, on, dom, RachetStore, Trackable, Grid, Pagination) {
	var Store = declare([RachetStore, Trackable]);
	var myStore = new Store('//localhost:8080');

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
		rowsPerPage: 10,
		minRowsPerPage: 20
	}, 'container');
	grid.startup();

	on(dom.byId('button'),'click', function(e) {
		var item = {'id':1, name: 'id 1', value: Math.floor(Math.random()*1000)};
		myStore.put(item);
	});
    }
); 

