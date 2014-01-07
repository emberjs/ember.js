/**
@module ember
@submodule ember-routing
*/

function DSL(name) {
  this.parent = name;
  this.matches = [];
}

DSL.prototype = {
  resource: function(name, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    if (typeof options.path !== 'string') {
      options.path = "/" + name;
    }

    if (callback) {
      var dsl = new DSL(name);
      route(dsl, 'loading');
      route(dsl, 'error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });
      callback.call(dsl);
      this.push(options.path, name, dsl.generate(), options.queryParams);
    } else {
      this.push(options.path, name, null, options.queryParams);
    }


    if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {
      // For namespace-preserving nested resource (e.g. resource('foo.bar') within
      // resource('foo')) we only want to use the last route name segment to determine
      // the names of the error/loading substates (e.g. 'bar_loading')
      name = name.split('.').pop();
      route(this, name + '_loading');
      route(this, name + '_error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });
    }
  },

  push: function(url, name, callback, queryParams) {
    var parts = name.split('.');
    if (url === "" || url === "/" || parts[parts.length-1] === "index") { this.explicitIndex = true; }

    this.matches.push([url, name, callback, queryParams]);
  },

  route: function(name, options) {
    route(this, name, options);
    if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {
      route(this, name + '_loading');
      route(this, name + '_error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });
    }
  },

  generate: function() {
    var dslMatches = this.matches;

    if (!this.explicitIndex) {
      this.route("index", { path: "/" });
    }

    return function(match) {
      for (var i=0, l=dslMatches.length; i<l; i++) {
        var dslMatch = dslMatches[i];
        var matchObj = match(dslMatch[0]).to(dslMatch[1], dslMatch[2]);
      }
    };
  }
};

function route(dsl, name, options) {
  Ember.assert("You must use `this.resource` to nest", typeof options !== 'function');

  options = options || {};

  if (typeof options.path !== 'string') {
    options.path = "/" + name;
  }

  if (dsl.parent && dsl.parent !== 'application') {
    name = dsl.parent + "." + name;
  }

  dsl.push(options.path, name, null, options.queryParams);
}

DSL.map = function(callback) {
  var dsl = new DSL();
  callback.call(dsl);
  return dsl;
};

Ember.RouterDSL = DSL;
