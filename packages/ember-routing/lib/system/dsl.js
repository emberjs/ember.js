import Ember from "ember-metal/core"; // FEATURES, assert

/**
@module ember
@submodule ember-routing
*/

function DSL(name) {
  this.parent = name;
  this.matches = [];
}
export default DSL;

DSL.prototype = {
  route: function(name, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    var type = options.resetNamespace === true ? 'resource' : 'route';
    Ember.assert("'basic' cannot be used as a " + type + " name.", name !== 'basic');


    if (typeof options.path !== 'string') {
      options.path = "/" + name;
    }

    if (canNest(this) && options.resetNamespace !== true) {
      name = this.parent + "." + name;
    }

    if (callback) {
      var dsl = new DSL(name);
      route(dsl, 'loading');
      route(dsl, 'error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });

      if (callback) { callback.call(dsl); }

      this.push(options.path, name, dsl.generate());
    } else {
      this.push(options.path, name, null);
    }

    if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {
      route(this, name + '_loading', {resetNamespace: options.resetNamespace});
      route(this, name + '_error', { path: "/_unused_dummy_error_path_route_" + name + "/:error"});
    }
  },

  push: function(url, name, callback) {
    var parts = name.split('.');
    if (url === "" || url === "/" || parts[parts.length-1] === "index") { this.explicitIndex = true; }

    this.matches.push([url, name, callback]);
  },

  resource: function(name, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    options.resetNamespace = true;
    this.route(name, options, callback);
  },

  generate: function() {
    var dslMatches = this.matches;

    if (!this.explicitIndex) {
      route(this, "index", { path: "/" });
    }

    return function(match) {
      for (var i=0, l=dslMatches.length; i<l; i++) {
        var dslMatch = dslMatches[i];
        var matchObj = match(dslMatch[0]).to(dslMatch[1], dslMatch[2]);
      }
    };
  }
};

function canNest(dsl) {
  return dsl.parent && dsl.parent !== 'application';
}

function route(dsl, name, options) {
  Ember.assert("You must use `this.resource` to nest", typeof options !== 'function');

  options = options || {};

  if (typeof options.path !== 'string') {
    options.path = "/" + name;
  }

  if (canNest(dsl) && options.resetNamespace !== true) {
    name = dsl.parent + "." + name;
  }

  dsl.push(options.path, name, null);
}

DSL.map = function(callback) {
  var dsl = new DSL();
  callback.call(dsl);
  return dsl;
};

