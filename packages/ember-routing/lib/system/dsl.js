import Ember from "ember-metal/core"; // FEATURES, assert
import { indexOf } from "ember-metal/array";

/**
@module ember
@submodule ember-routing
*/

function DSL(name, options) {
  this.parent = name;
  this.enableLoadingSubstates = options && options.enableLoadingSubstates;
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
    Ember.assert(
      "'" + name + "' cannot be used as a " + type + " name.",
      (function() {
        if (options.overrideNameAssertion === true) { return true; }

        return indexOf.call(['array', 'basic', 'object', 'application'], name) === -1;
      })()
    );

    if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {
      if (this.enableLoadingSubstates) {
        createRoute(this, name + '_loading', { resetNamespace: options.resetNamespace });
        createRoute(this, name + '_error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });
      }
    }

    if (callback) {
      var fullName = getFullName(this, name, options.resetNamespace);
      var dsl = new DSL(fullName, {
        enableLoadingSubstates: this.enableLoadingSubstates
      });

      createRoute(dsl, 'loading');
      createRoute(dsl, 'error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });

      callback.call(dsl);

      createRoute(this, name, options, dsl.generate());
    } else {
      createRoute(this, name, options);
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
      this.route("index", { path: "/" });
    }

    return function(match) {
      for (var i=0, l=dslMatches.length; i<l; i++) {
        var dslMatch = dslMatches[i];
        match(dslMatch[0]).to(dslMatch[1], dslMatch[2]);
      }
    };
  }
};

function canNest(dsl) {
  return dsl.parent && dsl.parent !== 'application';
}

function getFullName(dsl, name, resetNamespace) {
  if (canNest(dsl) && resetNamespace !== true) {
    return dsl.parent + "." + name;
  } else {
    return name;
  }
}

function createRoute(dsl, name, options, callback) {
  options = options || {};

  var fullName = getFullName(dsl, name, options.resetNamespace);

  if (typeof options.path !== 'string') {
    options.path = "/" + name;
  }

  dsl.push(options.path, fullName, callback);
}

DSL.map = function(callback) {
  var dsl = new DSL();
  callback.call(dsl);
  return dsl;
};

