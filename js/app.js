require([
		'dojo/_base/declare',
		'dojo/on',
		"dojo/dom", 
		"dojo/dom-construct",
		'rachet-store', 
		"dstore/Memory",
		"dstore/Trackable",
		'dgrid/Grid', 
		'dgrid/extensions/Pagination',
		'dgrid/Editor',
		'custom-editor',
		'dstore/Rest',
		'dojo/domReady!'
    ],
    function(declare, on, dom, domConstruct, RachetStore, Memory, Trackable, Grid, Pagination, Editor, CustomEditor, Rest) {
	var url = new URL(window.location);
	//*
	var Store = declare([RachetStore, Trackable]);
	var myStore = new Store({wsUrl:'//'+url.hostname+':8080', restUrl: 'rest/'});
	myStore.on('status-change',function(event) {
		domConstruct.place('<span>'+event.message+'</span>', dom.byId('socket-status'), "only");
	});
	myStore.connect();
	//*/
	/*
	var Store = declare([Rest, Trackable]);
	var myStore = new Store({target:  'rest/'});
	//*/
	var MyGrid = declare([Grid, Pagination, Editor]);
	var grid = new MyGrid({
        	collection: myStore,
		sort: [{property : 'value', descending:true}],
	        columns: [
			{
	        	    label: 'Id',
			    field: 'id'
			},
			{
		            label: 'Name',
			    field: 'name',
			    editor: 'text',
			    editOn: 'dblclick',
			    autoSave :true
			},
			{
		            label: 'Random value',
			    field: 'value',
			    editor: 'number',
			    autoSave :true
			},
			{
			    label: 'Operations',
			    sortable: false,
			    editor: CustomEditor,
		            editorArgs:{
			        store:myStore
			    }
      			}
		],
		className: "dgrid-autoheight",
		loadingMessage: 'Loading data...',
		showLoadingMessage: true,
		noDataMessage: 'No data found.',
		rowsPerPage: 10,
		minRowsPerPage: 20
	}, 'container');
	grid.startup();

	on(dom.byId('button'), 'click',function() {
		myStore.add({
			name : dom.byId('name').value,
			value: dom.byId('number').value
		});
	});
	//myStore.on('add, delete', function(event) { alert(event.index+' '+event.previousIndex+' '+JSON.stringify(event.target)); });
    }
); 

