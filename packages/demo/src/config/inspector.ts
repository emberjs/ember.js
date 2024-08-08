import * as computed from '@ember/object/computed';
import * as runloop from '@ember/runloop';
import * as metal from '@ember/-internals/metal';
import * as inst from '@ember/instrumentation';
import * as view from '@ember/-internals/views';
import * as ref from '@glimmer/reference';
import * as val from '@glimmer/validator';

let define = window.define,
  requireModule = window.requireModule;
if (typeof define !== 'function' || typeof requireModule !== 'function') {
  (function () {
    const registry = {
        ember: window.Ember,
      },
      seen = {};

    define = function (name, deps, callback) {
      if (arguments.length < 3) {
        callback = deps;
        deps = [];
      }
      registry[name] = { deps, callback };
    };

    requireModule = function (name) {
      if (name === '@ember/object/computed') {
        return computed;
      }
      if (name === '@ember/runloop') {
        return runloop;
      }
      if (name === '@ember/-internals/metal') {
        return metal;
      }
      if (name === '@ember/instrumentation') {
        return inst;
      }
      if (name === '@ember/-internals/views') {
        return view;
      }

      if (name === '@glimmer/reference') {
        return ref;
      }
      if (name === '@glimmer/validator') {
        return val;
      }

      if (name === 'ember') {
        return {
          default: window.Ember,
        };
      }

      if (seen[name]) {
        return seen[name];
      }

      const mod = registry[name];
      if (!mod) {
        throw new Error(`Module: '${name}' not found.`);
      }

      seen[name] = {};

      const deps = mod.deps;
      const callback = mod.callback;
      const reified = [];
      let exports;

      for (let i = 0, l = deps.length; i < l; i++) {
        if (deps[i] === 'exports') {
          reified.push((exports = {}));
        } else {
          reified.push(requireModule(deps[i]));
        }
      }

      const value = callback.apply(this, reified);
      seen[name] = exports || value;
      return seen[name];
    };

    define.registry = registry;
    define.seen = seen;
  })();
}
requireModule.entries = define.registry;

window.define = define;
window.requireModule = requireModule;
