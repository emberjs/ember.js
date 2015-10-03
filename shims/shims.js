;(function() {
  /* globals define, Ember, self */

  function defineModule(name, values) {
    define(name, [], function() {
      'use strict';

      return values;
    });
  }

  var shims = {
    'ember': {
      'default': Ember
    },
    'ember-application': {
      'default': Ember.Application
    },
    'ember-array': {
      'default': Ember.Array
    },
    'ember-array/mutable': {
      'default': Ember.MutableArray
    },
    'ember-array/utils': {
      'A':            Ember.A,
      'isEmberArray': Ember.isArray,
      'wrap':         Ember.makeArray
    },
    'ember-component': {
      'default': Ember.Component
    },
    'ember-components/checkbox': {
      'default': Ember.Checkbox
    },
    'ember-components/text-area': {
      'default': Ember.TextArea
    },
    'ember-components/text-field': {
      'default': Ember.TextField
    },
    'ember-controller': {
      'default': Ember.Controller
    },
    'ember-controller/inject': {
      'default': Ember.inject.controller
    },
    'ember-controller/proxy': {
      'default': Ember.ArrayProxy
    },
    'ember-controllers/sortable': {
      'default': Ember.SortableMixin
    },
    'ember-debug': {
      'log':      Ember.debug,
      'inspect':  Ember.inspect,
      'run':      Ember.runInDebug,
      'warn':     Ember.warn
    },
    'ember-debug/container-debug-adapter': {
      'default': Ember.ContainerDebugAdapter
    },
    'ember-debug/data-adapter': {
      'default': Ember.DataAdapter
    },
    'ember-deprecations': {
      'deprecate':      Ember.deprecate,
      'deprecateFunc':  Ember.deprecateFunc
    },
    'ember-enumerable': {
      'default': Ember.Enumerable
    },
    'ember-evented': {
      'default': Ember.Evented
    },
    'ember-evented/on': {
      'default': Ember.on
    },
    'ember-globals-resolver': {
      'default': Ember.DefaultResolver
    },
    'ember-helper': {
      'default':  Ember.Helper,
      'helper':   Ember.Helper && Ember.Helper.helper
    },
    'ember-instrumentation': {
      'instrument':   Ember.Instrumentation.instrument,
      'reset':        Ember.Instrumentation.reset,
      'subscribe':    Ember.Instrumentation.subscribe,
      'unsubscribe':  Ember.Instrumentation.unsubscribe
    },
    'ember-locations/hash': {
      'default': Ember.HashLocation
    },
    'ember-locations/history': {
      'default': Ember.HistoryLocation
    },
    'ember-locations/none': {
      'default': Ember.NoneLocation
    },
    'ember-map': {
      'default':      Ember.Map,
      'withDefault':  Ember.MapWithDefault
    },
    'ember-metal/destroy': {
      'default': Ember.destroy
    },
    'ember-metal/events': {
      'addListener':    Ember.addListener,
      'removeListener': Ember.removeListener,
      'send':           Ember.sendEvent
    },
    'ember-metal/get': {
      'default': Ember.get
    },
    'ember-metal/mixin': {
      'default': Ember.Mixin
    },
    'ember-metal/observer': {
      'default':        Ember.observer,
      'addObserver':    Ember.addObserver,
      'removeObserver': Ember.removeObserver
    },
    'ember-metal/on-load': {
      'default':  Ember.onLoad,
      'run':      Ember.runLoadHooks
    },
    'ember-metal/set': {
      'default':        Ember.set,
      'setProperties':  Ember.setProperties,
      'trySet':         Ember.trySet
    },
    'ember-metal/utils': {
      'aliasMethod':  Ember.aliasMethod,
      'assert':       Ember.assert,
      'cacheFor':     Ember.cacheFor,
      'copy':         Ember.copy,
    },
    'ember-object': {
      'default': Ember.Object
    },
    'ember-platform': {
      'assign':         Ember.merge,
      'create':         Ember.create,
      'defineProperty': Ember.platform.defineProperty,
      'hasAccessors':   Ember.platform.hasPropertyAccessors,
      'keys':           Ember.keys
    },
    'ember-route': {
      'default': Ember.Route
    },
    'ember-router': {
      'default': Ember.Router
    },
    'ember-runloop': {
      'default':      Ember.run,
      'begin':        Ember.run.begin,
      'bind':         Ember.run.bind,
      'cancel':       Ember.run.cancel,
      'debounce':     Ember.run.debounce,
      'end':          Ember.run.end,
      'join':         Ember.run.join,
      'later':        Ember.run.later,
      'next':         Ember.run.next,
      'once':         Ember.run.once,
      'schedule':     Ember.run.schedule,
      'scheduleOnce': Ember.run.scheduleOnce,
      'throttle':     Ember.run.throttle
    },
    'ember-service': {
      'default': Ember.Service
    },
    'ember-service/inject': {
      'default': Ember.inject.service
    },
    'ember-set/ordered': {
      'default': Ember.OrderedSet
    },
    'ember-string': {
      'camelize':     Ember.String.camelize,
      'capitalize':   Ember.String.capitalize,
      'classify':     Ember.String.classify,
      'dasherize':    Ember.String.dasherize,
      'decamelize':   Ember.String.decamelize,
      'fmt':          Ember.String.fmt,
      'htmlSafe':     Ember.String.htmlSafe,
      'loc':          Ember.String.loc,
      'underscore':   Ember.String.underscore,
      'w':            Ember.String.w
    },
    'ember-utils': {
      'isBlank':    Ember.isBlank,
      'isEmpty':    Ember.isEmpty,
      'isNone':     Ember.isNone,
      'isPresent':  Ember.isPresent,
      'tryInvoke':  Ember.tryInvoke,
      'typeOf':     Ember.typeOf
    }
  };

  // populate `ember/computed` named exports
  shims['ember-computed'] = {
    'default': Ember.computed
  };

  var computedMacros = [
    "empty","notEmpty", "none", "not", "bool", "match",
    "equal", "gt", "gte", "lt", "lte", "alias", "oneWay",
    "reads", "readOnly", "deprecatingAlias",
    "and", "or", "collect", "sum", "min", "max",
    "map", "sort", "setDiff", "mapBy", "mapProperty",
    "filter", "filterBy", "filterProperty", "uniq",
    "union", "intersect"
  ];

  for (var i = 0, l = computedMacros.length; i < l; i++) {
    var key = computedMacros[i];
    shims['ember-computed'][key] = Ember.computed[key];
  }

  for (var moduleName in shims) {
    defineModule(moduleName, shims[moduleName]);
  }

  if (Ember.Test) {
    defineModule('ember-test', { 'default': Ember.Test });
  }

  generateModule('jquery', { 'default': self.jQuery });
})();
