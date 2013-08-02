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
    declareRoute(this, name, options, callback, false);
  },

  push: function(url, name, callback) {
    var parts = name.split('.');
    if (url === "" || url === "/" || parts[parts.length-1] === "index") { this.explicitIndex = true; }

    this.matches.push([url, name, callback]);
  },

  route: function(name, options, callback) {
    declareRoute(this, name, options, callback, true);
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

function declareRoute(dsl, name, options, callback, preserveNamespace) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  options = options || {};

  if (typeof options.path !== 'string') {
    options.path = "/" + name;
  }

  if (preserveNamespace && dsl.parent && dsl.parent !== 'application') {
    name = dsl.parent + "." + name;
  }

  if (callback) {
    var childDSL = new DSL(name);
    callback.call(childDSL);
    dsl.push(options.path, name, childDSL.generate());
  } else {
    dsl.push(options.path, name);
  }
}

DSL.map = function(callback) {
  var dsl = new DSL();
  callback.call(dsl);
  return dsl;
};

Ember.RouterDSL = DSL;
