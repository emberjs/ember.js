import { assert, deprecate, warn } from 'ember-metal/debug';

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
  route(name, options, callback) {
    var dummyErrorRoute = `/_unused_dummy_error_path_route_${name}/:error`;
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    assert(
      `'${name}' cannot be used as a route name.`,
      (function() {
        if (options.overrideNameAssertion === true) { return true; }

        return ['array', 'basic', 'object', 'application'].indexOf(name) === -1;
      })()
    );

    warn(
      `Using a route named 'select' (and defining a App.SelectView) will prevent you from using {{view 'select'}}`,
      name !== 'select',
      { id: 'ember-routing.dsl-select-route' }
    );

    if (this.enableLoadingSubstates) {
      createRoute(this, `${name}_loading`, { resetNamespace: options.resetNamespace });
      createRoute(this, `${name}_error`, { path: dummyErrorRoute });
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
    deprecate('this.resource() is deprecated. Use this.route(\'name\', { resetNamespace: true }, function () {}) instead.', false, { id: 'ember-routing.router-resource', until: '3.0.0' });
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
