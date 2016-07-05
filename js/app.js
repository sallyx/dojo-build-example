require([
		'dojo/_base/declare',
		'dojo/on',
		"dojo/dom", 
		'rachet-store', 
		"dstore/Memory",
		"dstore/Trackable",
		'dgrid/Grid', 
		'dgrid/extensions/Pagination',
		'dgrid/Editor',
		'custom-editor',
		'dojo/domReady!'
    ],
    function(declare, on, dom, RachetStore, Memory, Trackable, Grid, Pagination, Editor, CustomEditor) {


	var Store = declare([RachetStore, Trackable]);
	var myStore = new Store('//localhost:8080');

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

