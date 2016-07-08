define([ 
	'dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/Toolbar',
	'dijit/form/Button'
],
function(declare, _WidgetBase, Toolbar, Button) {
	return declare([_WidgetBase], {
		store: null,
		value: null,
		buildRendering: function() {
		      var self = this;
		      this.inherited(arguments);
		      self._toolbar = new Toolbar({});
		      var removeButton = new Button({
		        iconClass: "fa fa-times"
		      });
		      self._toolbar.addChild(removeButton);
		      removeButton.on("click",function(){
			self.store.remove(self.value.id);
		      });
		      self.domNode.appendChild(self._toolbar.domNode);
    		},
	        _setStoreAttr: function(store) {
		      this.store = store;
		},
		_getStoreAttr: function() {
		      return this.store;
		},
		destroy: function() {
		      this._toolbar.destroy();
		      this.inherited(arguments);
		}
	});
});
