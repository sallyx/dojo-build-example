var profile = (function(){
    return {
        resourceTags: {
            amd: function(filename, mid) {
                return /\.js$/.test(filename);
            },
	    miniExclude: function(filename, mid) {
		return /public_html\/dojo\/js\/my\/data\/authors\.json$/.test(filename)
			&& /^my\/widget/.test(mid);
	    },
	    declarative: function(filename, mid){
		    return /\.htm(l)?$/.test(filename); // tags any .html or .htm files as declarative
	    }
        }
    };
})();
