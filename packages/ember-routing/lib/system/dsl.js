import Ember from 'ember-metal/core'; // FEATURES, assert
import isEnabled from 'ember-metal/features';

/**
@module ember
@submodule ember-routing
*/

function assertName(name, type) {
  Ember.assert(`'${name}' cannot be used as a ${type} name.`, ['array', 'basic', 'object', 'application'].indexOf(name) === -1);
}

function DSL(name, options) {
  this.parent = name;
  this.enableLoadingSubstates = options && options.enableLoadingSubstates;

  if (isEnabled('ember-routing-namespace')) {
    this.isNamespace = options && options.isNamespace;
  }

  this.matches = [];
}
export default DSL;

DSL.prototype = {
  route(name, options, callback) {
    var dummyErrorRoute = `/_unused_dummy_error_path_route_${name}/:error`;
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    if (options.overrideNameAssertion !== true) {
      assertName(name, 'route');
    }

    Ember.warn(
      `Using a route named 'select' (and defining a App.SelectView) will prevent you from using {{view 'select'}}`,
      name !== 'select',
      { id: 'ember-routing.dsl-select-route' }
    );

    if (isEnabled('ember-routing-named-substates')) {
      if (this.enableLoadingSubstates) {
        createRoute(this, `${name}_loading`, { resetNamespace: options.resetNamespace });
        createRoute(this, `${name}_error`, { path: dummyErrorRoute });
      }
    }

    if (callback) {
      var fullName = getFullName(this, name, options.resetNamespace);
      var dsl = new DSL(fullName, {
        enableLoadingSubstates: this.enableLoadingSubstates
      });

      createRoute(dsl, 'loading');
      createRoute(dsl, 'error', { path: dummyErrorRoute });

      callback.call(dsl);

      createRoute(this, name, options, dsl.generate());
    } else {
      createRoute(this, name, options);
    }
  },

  push(url, name, callback) {
    var parts = name.split('.');
    if (url === '' || url === '/' || parts[parts.length - 1] === 'index') { this.explicitIndex = true; }

    this.matches.push([url, name, callback]);
  },

  resource(name, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    options.resetNamespace = true;
    Ember.deprecate('this.resource() is deprecated. Use this.route(\'name\', { resetNamespace: true }, function () {}) instead.', false, { id: 'ember-routing.router-resource', until: '3.0.0' });
    this.route(name, options, callback);
  },

  generate() {
    var dslMatches = this.matches;

    if (!this.explicitIndex) {
      this.route('index', { path: '/' });
    }

    return function(match) {
      for (var i = 0, l = dslMatches.length; i < l; i++) {
        var dslMatch = dslMatches[i];
        match(dslMatch[0]).to(dslMatch[1], dslMatch[2]);
      }
    };
  }
};

if (isEnabled('ember-routing-namespace')) {
  DSL.prototype.namespace = function namespace(name, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    Ember.assert(`You cannot create namespace '${name}' without a function provided.`, !!callback);

    assertName(name, 'namespace');

    options.isNamespace = true;

    var fullName = getFullName(this, name);
    var dsl = new DSL(fullName, { isNamespace: true });

    callback.call(dsl);

    createRoute(this, name, options, dsl.generate());
  };

  // you can just replace this whole function with the one above
  // if/when ember-routing-namespace is on by default.
  DSL.prototype.generate = function generate() {
    var dslMatches = this.matches;

    if (!this.explicitIndex && !this.isNamespace) {
      this.route('index', { path: '/' });
    }

    return function(match) {
      for (var i = 0, l = dslMatches.length; i < l; i++) {
        var dslMatch = dslMatches[i];
        if (dslMatch[1] === null) {
          match(dslMatch[0], dslMatch[2]);
        } else {
          match(dslMatch[0]).to(dslMatch[1], dslMatch[2]);
        }
      }
    };
  };

  // you can just replace this whole function with the one above
  // if/when ember-routing-namespace is on by default.
  DSL.prototype.push = function push(url, name, callback) {
    var parts = (name === null) ? [] : name.split('.');
    if (url === '' || url === '/' || parts[parts.length - 1] === 'index') { this.explicitIndex = true; }

    this.matches.push([url, name, callback]);
  };
}

function canNest(dsl) {
  return dsl.parent && dsl.parent !== 'application';
}

function getFullName(dsl, name, resetNamespace) {
  if (canNest(dsl) && resetNamespace !== true) {
    return `${dsl.parent}.${name}`;
  } else {
    return name;
  }
}

function createRoute(dsl, name, options, callback) {
  options = options || {};

  var fullName = getFullName(dsl, name, options.resetNamespace);

  if (isEnabled('ember-routing-namespace')) {
    if (options.isNamespace) {
      fullName = null;
    }
  }

  if (typeof options.path !== 'string') {
    options.path = `/${name}`;
  }

  dsl.push(options.path, fullName, callback);
}

DSL.map = function(callback) {
  var dsl = new DSL();
  callback.call(dsl);
  return dsl;
};
