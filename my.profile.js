var profile = (function(){
    return {
        basePath: "./src",
        releaseDir: "../release",
        releaseName: "my",
        action: "release",
 	defaultConfig: {
            async: 1
        },

        packages:[{
            name: "dojo",
            location: "dojo"
        },{
            name: "dijit",
            location: "dijit"
        },{
            name: "dojox",
            location: "dojox"
        },{
            name: "my",
            location: "../js/my",
            destLocation: "myapp"
        }],
        layers: {
            "dojo/dojo": {
                include: ["dojo/main" ],
                customBase: true,
                boot: true
            }
           //, "my/widget": { include: [ "my/widget/AuthorWidget", "my/widget/templates/AuthorWidget.html" ] }
           , "my/widget": { include: [ "my/widget/all" ] }
        },
	layerOptimize: "closure",
	optimize: "closure",
	cssOptimize: "comments",
	mini: true,
	stripConsole: "warn",
	selectorEngine: "lite" //see the dojo/query documentation for more information about the lite engine capabilities)
    };
})();
