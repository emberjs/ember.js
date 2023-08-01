/* eslint-disable no-var */
/* globals global globalThis self Proxy */
/* eslint-disable-next-line no-unused-vars */
var define, require;

(function () {
  let globalObj =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : null;

  if (globalObj === null) {
    throw new Error('unable to locate global object');
  }

  if (typeof globalObj.define === 'function' && typeof globalObj.require === 'function') {
    define = globalObj.define;
    require = globalObj.require;

    return;
  }

  let registry = Object.create(null);
  let seen = Object.create(null);

  function missingModule(name, referrerName) {
    if (referrerName) {
      throw new Error('Could not find module ' + name + ' required by: ' + referrerName);
    } else {
      throw new Error('Could not find module ' + name);
    }
  }

  function internalRequire(_name, referrerName) {
    let name = _name;
    let mod = registry[name];

    if (!mod) {
      name = name + '/index';
      mod = registry[name];
    }

    let exports = seen[name];

    if (exports !== undefined) {
      return exports;
    }

    if (!mod) {
      seen[name] = {};
      missingModule(_name, referrerName);
    }

    let deps = mod.deps;
    let callback = mod.callback;
    let reified = new Array(deps.length);
    let moduleTarget;

    if (deps.some((dep) => dep === 'exports')) {
      exports = seen[name] = {};
    } else {
      exports = seen[name] = new Proxy(
        {},
        {
          get(target, key) {
            if (moduleTarget) {
              return moduleTarget[key];
            }
          },
          set() {
            throw new Error('illegal module mutation');
          },
          deleteProperty() {
            throw new Error('illegal module mutation');
          },
          ownKeys() {
            if (moduleTarget) {
              return Object.keys(moduleTarget);
            }
          },
        }
      );
    }

    for (let i = 0; i < deps.length; i++) {
      if (deps[i] === 'exports') {
        reified[i] = exports;
      } else if (deps[i] === 'require') {
        reified[i] = require;
      } else {
        reified[i] = require(deps[i], name);
      }
    }

    moduleTarget = callback.apply(this, reified);
    return exports;
  }

  require = function (name) {
    return internalRequire(name, null);
  };

  define = function (name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  // setup `require` module
  require['default'] = require;

  require.has = function registryHas(moduleName) {
    return Boolean(registry[moduleName]) || Boolean(registry[moduleName + '/index']);
  };

  require._eak_seen = require.entries = registry;
})();
