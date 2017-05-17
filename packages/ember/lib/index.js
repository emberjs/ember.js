import require, { has } from 'require';

// ****ember-environment****
import { ENV, context } from 'ember-environment';
import * as utils from 'ember-utils';

import { Registry, Container } from 'container';

// ****ember-metal****
import Ember, * as metal from 'ember-metal';

// ember-utils exports
Ember.getOwner = utils.getOwner;
Ember.setOwner = utils.setOwner;
Ember.generateGuid = utils.generateGuid;
Ember.GUID_KEY = utils.GUID_KEY;
Ember.guidFor = utils.guidFor;
Ember.inspect = utils.inspect;
Ember.makeArray = utils.makeArray;
Ember.canInvoke = utils.canInvoke;
Ember.tryInvoke = utils.tryInvoke;
Ember.wrap = utils.wrap;
Ember.applyStr = utils.applyStr;
Ember.uuid = utils.uuid;
Ember.assign = Object.assign || utils.assign;

// container exports
Ember.Container = Container;
Ember.Registry = Registry;

// need to import this directly, to ensure the babel feature
// flag plugin works properly
import * as EmberDebug from 'ember-debug';
import { deprecate, runInDebug, deprecateFunc } from 'ember-debug';

const computed = metal.computed;
computed.alias = metal.alias;
Ember.computed = computed;
Ember.ComputedProperty = metal.ComputedProperty;
Ember.cacheFor = metal.cacheFor;

Ember.assert = function() { };
Ember.warn = function() { };
Ember.debug = function() { };
Ember.deprecate = function () { };
Ember.deprecateFunc = function() { return arguments[arguments.length - 1]; };
Ember.runInDebug = function() { };

runInDebug(function() {
  Ember.assert = EmberDebug.assert;
  Ember.warn = EmberDebug.warn;
  Ember.debug = EmberDebug.debug;
  Ember.deprecate = EmberDebug.deprecate;
  Ember.deprecateFunc = EmberDebug.deprecateFunc;
  Ember.runInDebug = EmberDebug.runInDebug;
});

/**
  @public
  @class Ember.Debug
*/
Ember.Debug = {
  registerDeprecationHandler: EmberDebug.registerDeprecationHandler,
  registerWarnHandler: EmberDebug.registerWarnHandler
};
Ember.merge = metal.merge;

Ember.instrument = metal.instrument;
Ember.subscribe = metal.instrumentationSubscribe;
Ember.Instrumentation = {
  instrument: metal.instrument,
  subscribe: metal.instrumentationSubscribe,
  unsubscribe: metal.instrumentationUnsubscribe,
  reset: metal.instrumentationReset
};

Ember.Error = EmberDebug.Error;
Ember.META_DESC = metal.META_DESC;
Ember.meta = metal.meta;
Ember.get = metal.get;
Ember.getWithDefault = metal.getWithDefault;
Ember._getPath = metal._getPath;
Ember.set = metal.set;
Ember.trySet = metal.trySet;
Ember.FEATURES = EmberDebug.FEATURES;
Ember.FEATURES.isEnabled = EmberDebug.isFeatureEnabled;
Ember._Cache = metal.Cache;
Ember.on = metal.on;
Ember.addListener = metal.addListener;
Ember.removeListener = metal.removeListener;
Ember._suspendListener = metal.suspendListener;
Ember._suspendListeners = metal.suspendListeners;
Ember.sendEvent = metal.sendEvent;
Ember.hasListeners = metal.hasListeners;
Ember.watchedEvents = metal.watchedEvents;
Ember.listenersFor = metal.listenersFor;
Ember.accumulateListeners = metal.accumulateListeners;
Ember.isNone = metal.isNone;
Ember.isEmpty = metal.isEmpty;
Ember.isBlank = metal.isBlank;
Ember.isPresent = metal.isPresent;
Ember.run = metal.run;
Ember._ObserverSet = metal.ObserverSet;
Ember.propertyWillChange = metal.propertyWillChange;
Ember.propertyDidChange = metal.propertyDidChange;
Ember.overrideChains = metal.overrideChains;
Ember.beginPropertyChanges = metal.beginPropertyChanges;
Ember.endPropertyChanges = metal.endPropertyChanges;
Ember.changeProperties = metal.changeProperties;
Ember.platform        = {
  defineProperty: true,
  hasPropertyAccessors: true
};
Ember.defineProperty = metal.defineProperty;
Ember.watchKey = metal.watchKey;
Ember.unwatchKey = metal.unwatchKey;
Ember.removeChainWatcher = metal.removeChainWatcher;
Ember._ChainNode = metal.ChainNode;
Ember.finishChains = metal.finishChains;
Ember.watchPath = metal.watchPath;
Ember.unwatchPath = metal.unwatchPath;
Ember.watch = metal.watch;
Ember.isWatching = metal.isWatching;
Ember.unwatch = metal.unwatch;
Ember.destroy = metal.destroy;
Ember.libraries = metal.libraries;
Ember.OrderedSet = metal.OrderedSet;
Ember.Map = metal.Map;
Ember.MapWithDefault = metal.MapWithDefault;
Ember.getProperties = metal.getProperties;
Ember.setProperties = metal.setProperties;
Ember.expandProperties = metal.expandProperties;
Ember.NAME_KEY = utils.NAME_KEY;
Ember.addObserver = metal.addObserver;
Ember.observersFor = metal.observersFor;
Ember.removeObserver = metal.removeObserver;
Ember._suspendObserver = metal._suspendObserver;
Ember._suspendObservers = metal._suspendObservers;
Ember.required = metal.required;
Ember.aliasMethod = metal.aliasMethod;
Ember.observer = metal.observer;
Ember.immediateObserver = metal._immediateObserver;
Ember.mixin = metal.mixin;
Ember.Mixin = metal.Mixin;
Ember.bind = metal.bind;
Ember.Binding = metal.Binding;
Ember.isGlobalPath = metal.isGlobalPath;

if (EmberDebug.isFeatureEnabled('ember-metal-weakmap')) {
  Ember.WeakMap = metal.WeakMap;
}

Object.defineProperty(Ember, 'ENV', {
  get() { return ENV; },
  enumerable: false
});

/**
 The context that Ember searches for namespace instances on.

 @private
 */
Object.defineProperty(Ember, 'lookup', {
  get()      { return context.lookup; },
  set(value) { context.lookup = value; },
  enumerable: false
});

Ember.EXTEND_PROTOTYPES = ENV.EXTEND_PROTOTYPES;

// BACKWARDS COMPAT ACCESSORS FOR ENV FLAGS
Object.defineProperty(Ember, 'LOG_STACKTRACE_ON_DEPRECATION', {
  get()      { return ENV.LOG_STACKTRACE_ON_DEPRECATION;    },
  set(value) { ENV.LOG_STACKTRACE_ON_DEPRECATION = !!value; },
  enumerable: false
});

Object.defineProperty(Ember, 'LOG_VERSION', {
  get()      { return ENV.LOG_VERSION;   },
  set(value) { ENV.LOG_VERSION = !!value; },
  enumerable: false
});

runInDebug(function() {
  Object.defineProperty(Ember, 'MODEL_FACTORY_INJECTIONS', {
    get()      { return false; },
    set(value) {
      deprecate(
        'Ember.MODEL_FACTORY_INJECTIONS is no longer required',
        false,
        {
          id: 'ember-metal.model_factory_injections',
          until: '2.17.0',
          url: 'http://emberjs.com/deprecations/v2.x#toc_code-ember-model-factory-injections'
        }
      );
    },
    enumerable: false
  });
});

Object.defineProperty(Ember, 'LOG_BINDINGS', {
  get()      { return ENV.LOG_BINDINGS;    },
  set(value) { ENV.LOG_BINDINGS = !!value; },
  enumerable: false
});

/**
  A function may be assigned to `Ember.onerror` to be called when Ember
  internals encounter an error. This is useful for specialized error handling
  and reporting code.

  ```javascript
  Ember.onerror = function(error) {
    Em.$.ajax('/report-error', 'POST', {
      stack: error.stack,
      otherInformation: 'whatever app state you want to provide'
    });
  };
  ```

  Internally, `Ember.onerror` is used as Backburner's error handler.

  @event onerror
  @for Ember
  @param {Exception} error the error object
  @public
*/
Object.defineProperty(Ember, 'onerror', {
  get: metal.getOnerror,
  set: metal.setOnerror,
  enumerable: false
});

/**
  An empty function useful for some operations. Always returns `this`.

  @method K
  @return {Object}
  @public
*/
function deprecatedEmberK() { return this; }

Object.defineProperty(Ember, 'K', {
  get() {
    deprecate(
      'Ember.K is deprecated in favor of defining a function inline.',
      false,
      {
        id: 'ember-metal.ember-k',
        until: '3.0.0',
        url: 'http://emberjs.com/deprecations/v2.x#toc_code-ember-k-code'
      }
    );

    return deprecatedEmberK;
  }
});

Object.defineProperty(Ember, 'testing', {
  get: EmberDebug.isTesting,
  set: EmberDebug.setTesting,
  enumerable: false
});

import Backburner from 'backburner';

/**
 @class Backburner
 @for Ember
 @private
 */
Ember.Backburner = function() {
  deprecate(
    'Usage of Ember.Backburner is deprecated.',
    false,
    {
      id: 'ember-metal.ember-backburner',
      until: '2.8.0',
      url: 'http://emberjs.com/deprecations/v2.x/#toc_ember-backburner'
    }
  );

  function BackburnerAlias(args) {
    return Backburner.apply(this, args);
  }

  BackburnerAlias.prototype = Backburner.prototype;

  return new BackburnerAlias(arguments);
};

Ember._Backburner = Backburner;


import Logger from 'ember-console';

Ember.Logger = Logger;

// ****ember-runtime****

import {
  String as EmberString,
  Object as EmberObject,
  RegistryProxyMixin,
  ContainerProxyMixin,
  compare,
  copy,
  isEqual,
  inject,
  Array as EmberArray,
  Copyable,
  Freezable,
  FROZEN_ERROR,
  MutableEnumerable,
  MutableArray,
  TargetActionSupport,
  Evented,
  PromiseProxyMixin,
  Observable,
  typeOf,
  isArray,
  onLoad,
  runLoadHooks,
  Controller,
  ControllerMixin,
  Service,
  _ProxyMixin,
  RSVP,
  Comparable,
  Namespace,
  Enumerable,
  ArrayProxy,
  ObjectProxy,
  ActionHandler,
  CoreObject,
  NativeArray,
  isNamespaceSearchDisabled,
  setNamespaceSearchDisabled,
  getStrings,
  setStrings,

  // computed macros
  empty,
  notEmpty,
  none,
  not,
  bool,
  match,
  equal,
  gt,
  gte,
  lt,
  lte,
  oneWay,
  readOnly,
  deprecatingAlias,
  and,
  or,
  any,

  // reduced computed macros
  sum,
  min,
  max,
  map,
  sort,
  setDiff,
  mapBy,
  filter,
  filterBy,
  uniq,
  uniqBy,
  union,
  intersect,
  collect
} from 'ember-runtime';

Ember.String = EmberString;
Ember.Object = EmberObject;
Ember._RegistryProxyMixin = RegistryProxyMixin;
Ember._ContainerProxyMixin = ContainerProxyMixin;
Ember.compare = compare;
Ember.copy = copy;
Ember.isEqual = isEqual;
Ember.inject = inject;
Ember.Array = EmberArray;
Ember.Comparable = Comparable;
Ember.Enumerable = Enumerable;
Ember.ArrayProxy = ArrayProxy;
Ember.ObjectProxy = ObjectProxy;
Ember.ActionHandler = ActionHandler;
Ember.CoreObject = CoreObject;
Ember.NativeArray = NativeArray;
Ember.Copyable = Copyable;
Ember.Freezable = Freezable;
Ember.FROZEN_ERROR = FROZEN_ERROR;
Ember.MutableEnumerable = MutableEnumerable;
Ember.MutableArray = MutableArray;
Ember.TargetActionSupport = TargetActionSupport;
Ember.Evented = Evented;
Ember.PromiseProxyMixin = PromiseProxyMixin;
Ember.Observable = Observable;
Ember.typeOf = typeOf;
Ember.isArray = isArray;
Ember.Object = EmberObject;
Ember.onLoad = onLoad;
Ember.runLoadHooks = runLoadHooks;
Ember.Controller = Controller;
Ember.ControllerMixin = ControllerMixin;
Ember.Service = Service;
Ember._ProxyMixin = _ProxyMixin;
Ember.RSVP = RSVP;
Ember.Namespace = Namespace;

// ES6TODO: this seems a less than ideal way/place to add properties to Ember.computed
computed.empty = empty;
computed.notEmpty = notEmpty;
computed.none = none;
computed.not = not;
computed.bool = bool;
computed.match = match;
computed.equal = equal;
computed.gt = gt;
computed.gte = gte;
computed.lt = lt;
computed.lte = lte;
computed.oneWay = oneWay;
computed.reads = oneWay;
computed.readOnly = readOnly;
computed.deprecatingAlias = deprecatingAlias;
computed.and = and;
computed.or = or;
computed.any = any;

computed.sum = sum;
computed.min = min;
computed.max = max;
computed.map = map;
computed.sort = sort;
computed.setDiff = setDiff;
computed.mapBy = mapBy;
computed.filter = filter;
computed.filterBy = filterBy;
computed.uniq = uniq;

computed.uniqBy = uniqBy;
computed.union = union;
computed.intersect = intersect;
computed.collect = collect;

/**
 Defines the hash of localized strings for the current language. Used by
 the `Ember.String.loc()` helper. To localize, add string values to this
 hash.

 @property STRINGS
 @for Ember
 @type Object
 @private
 */
Object.defineProperty(Ember, 'STRINGS', {
  configurable: false,
  get: getStrings,
  set: setStrings
});

/**
 Whether searching on the global for new Namespace instances is enabled.

 This is only exported here as to not break any addons.  Given the new
 visit API, you will have issues if you treat this as a indicator of
 booted.

 Internally this is only exposing a flag in Namespace.

 @property BOOTED
 @for Ember
 @type Boolean
 @private
 */
Object.defineProperty(Ember, 'BOOTED', {
  configurable: false,
  enumerable: false,
  get: isNamespaceSearchDisabled,
  set: setNamespaceSearchDisabled
});

import {
  Component,
  Helper,
  helper,
  Checkbox,
  TextField,
  TextArea,
  LinkComponent,
  htmlSafe,
  template,
  escapeExpression,
  isHTMLSafe,
  makeBoundHelper,
  getTemplates,
  setTemplates,
  _getSafeString
} from 'ember-glimmer';

Ember.Component = Component;
Helper.helper = helper;
Ember.Helper = Helper;
Ember.Checkbox = Checkbox;
Ember.TextField = TextField;
Ember.TextArea = TextArea;
Ember.LinkComponent = LinkComponent;

if (ENV.EXTEND_PROTOTYPES.String) {
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}

let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
let EmberHTMLBars = Ember.HTMLBars = Ember.HTMLBars || {};
let EmberHandleBarsUtils = EmberHandlebars.Utils = EmberHandlebars.Utils || {};

Object.defineProperty(EmberHandlebars, 'SafeString', {
  get: _getSafeString
});

EmberHTMLBars.template = EmberHandlebars.template = template;
EmberHandleBarsUtils.escapeExpression = escapeExpression;
EmberString.htmlSafe = htmlSafe;

EmberString.isHTMLSafe = isHTMLSafe;
EmberHTMLBars.makeBoundHelper = makeBoundHelper;

/**
 Global hash of shared templates. This will automatically be populated
 by the build tools so that you can store your Handlebars templates in
 separate files that get loaded into JavaScript at buildtime.

 @property TEMPLATES
 @for Ember
 @type Object
 @private
 */
Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false
});

import VERSION from './version';
export { VERSION };

/**
 The semantic version
 @property VERSION
 @type String
 @public
 */
Ember.VERSION = VERSION;

metal.libraries.registerCoreLibrary('Ember', VERSION);

Ember.create = deprecateFunc('Ember.create is deprecated in favor of Object.create', { id: 'ember-metal.ember-create', until: '3.0.0' }, Object.create);
Ember.keys = deprecateFunc('Ember.keys is deprecated in favor of Object.keys', { id: 'ember-metal.ember.keys', until: '3.0.0' }, Object.keys);

// require the main entry points for each of these packages
// this is so that the global exports occur properly
import * as views from 'ember-views';
/**
 Alias for jQuery

 @method $
 @for Ember
 @public
 */
Ember.$ = views.jQuery;

Ember.ViewTargetActionSupport = views.ViewTargetActionSupport;

Ember.ViewUtils = {
  isSimpleClick: views.isSimpleClick,
  getViewElement: views.getViewElement,
  getViewBounds: views.getViewBounds,
  getViewClientRects: views.getViewClientRects,
  getViewBoundingClientRect: views.getViewBoundingClientRect,
  getRootViews: views.getRootViews,
  getChildViews: views.getChildViews
};

Ember.TextSupport = views.TextSupport;
Ember.ComponentLookup = views.ComponentLookup;
Ember.EventDispatcher = views.EventDispatcher;

import * as routing from 'ember-routing';

Ember.Location = routing.Location;
Ember.AutoLocation = routing.AutoLocation;
Ember.HashLocation = routing.HashLocation;
Ember.HistoryLocation = routing.HistoryLocation;
Ember.NoneLocation = routing.NoneLocation;
Ember.controllerFor = routing.controllerFor;
Ember.generateControllerFactory = routing.generateControllerFactory;
Ember.generateController = routing.generateController;
Ember.RouterDSL = routing.RouterDSL;
Ember.Router = routing.Router;
Ember.Route = routing.Route;

import * as application from 'ember-application';

Ember.Application = application.Application;
Ember.ApplicationInstance = application.ApplicationInstance;
Ember.Engine = application.Engine;
Ember.EngineInstance = application.EngineInstance;
Ember.DefaultResolver = Ember.Resolver = application.Resolver;

runLoadHooks('Ember.Application', application.Application);

import * as extensionSupport from 'ember-extension-support';

Ember.DataAdapter = extensionSupport.DataAdapter;
Ember.ContainerDebugAdapter = extensionSupport.ContainerDebugAdapter;


if (has('ember-template-compiler')) {
  require('ember-template-compiler');
}

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
if (has('ember-testing')) {
  let testing = require('ember-testing');

  Ember.Test = testing.Test;
  Ember.Test.Adapter = testing.Adapter;
  Ember.Test.QUnitAdapter = testing.QUnitAdapter;
  Ember.setupForTesting = testing.setupForTesting;
}

runLoadHooks('Ember');

/**
@module ember
*/
export default Ember;

/* globals module */
if (typeof module === 'object' && module.exports) {
  module.exports = Ember;
} else {
  context.exports.Ember = context.exports.Em = Ember;
}
