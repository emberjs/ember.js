import require, { has } from 'require';

import { getENV, getLookup, setLookup, ENV, context } from 'ember-environment';
import { IS_NODE, module } from 'node-module';
import * as utils from 'ember-utils';
import { Registry, Container } from 'container';
import * as instrumentation from '@ember/instrumentation';
import * as metal from 'ember-metal';
import * as FLAGS from 'ember/features';
import * as EmberDebug from 'ember-debug';
import Backburner from 'backburner';
import Logger from 'ember-console';
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
  MutableEnumerable,
  MutableArray,
  TargetActionSupport,
  Evented,
  PromiseProxyMixin,
  Observable,
  typeOf,
  isArray,
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
  A,
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
  collect,
} from 'ember-runtime';
import {
  Checkbox,
  Component,
  componentManager,
  escapeExpression,
  getTemplates,
  Helper,
  helper,
  htmlSafe,
  isHTMLSafe,
  LinkComponent,
  setTemplates,
  template,
  TextField,
  TextArea,
  isSerializationFirstNode,
} from 'ember-glimmer';
import VERSION from './version';
import * as views from 'ember-views';
import * as routing from 'ember-routing';
import * as application from 'ember-application';
import * as extensionSupport from 'ember-extension-support';
import EmberError from '@ember/error';
import * as runloop from '@ember/runloop';
import { getOnerror, setOnerror } from 'ember-error-handling';
import { getOwner, setOwner } from 'ember-owner';
import Application, { onLoad, runLoadHooks } from '@ember/application';
import Resolver from '@ember/application/globals-resolver';

// ****ember-environment****

const Ember = (typeof context.imports.Ember === 'object' && context.imports.Ember) || {};

Ember.isNamespace = true;
Ember.toString = function() {
  return 'Ember';
};

Object.defineProperty(Ember, 'ENV', {
  get: getENV,
  enumerable: false,
});

Object.defineProperty(Ember, 'lookup', {
  get: getLookup,
  set: setLookup,
  enumerable: false,
});

// ****@ember/application****
Ember.getOwner = getOwner;
Ember.setOwner = setOwner;
Ember.Application = Application;
Ember.DefaultResolver = Ember.Resolver = Resolver;

// ****ember-utils****
Ember.generateGuid = utils.generateGuid;
Ember.GUID_KEY = utils.GUID_KEY;
Ember.guidFor = utils.guidFor;
Ember.inspect = utils.inspect;
Ember.makeArray = utils.makeArray;
Ember.canInvoke = utils.canInvoke;
Ember.tryInvoke = utils.tryInvoke;
Ember.wrap = utils.wrap;
Ember.uuid = utils.uuid;
Ember.assign = utils.assign;
Ember.NAME_KEY = utils.NAME_KEY;

// ****container****
Ember.Container = Container;
Ember.Registry = Registry;

// ****ember-debug****
Ember.assert = EmberDebug.assert;
Ember.warn = EmberDebug.warn;
Ember.debug = EmberDebug.debug;
Ember.deprecate = EmberDebug.deprecate;
Ember.deprecateFunc = EmberDebug.deprecateFunc;
Ember.runInDebug = EmberDebug.runInDebug;

// ****@ember/error****
Ember.Error = EmberError;

/**
  @public
  @class Ember.Debug
*/
Ember.Debug = {
  registerDeprecationHandler: EmberDebug.registerDeprecationHandler,
  registerWarnHandler: EmberDebug.registerWarnHandler,
};

// ****@ember/instrumentation****
Ember.instrument = instrumentation.instrument;
Ember.subscribe = instrumentation.subscribe;
Ember.Instrumentation = {
  instrument: instrumentation.instrument,
  subscribe: instrumentation.subscribe,
  unsubscribe: instrumentation.unsubscribe,
  reset: instrumentation.reset,
};

// ****@ember/runloop****

// Using _globalsRun here so that mutating the function (adding
// `next`, `later`, etc to it) is only available in globals builds
Ember.run = runloop._globalsRun;
Ember.run.backburner = runloop.backburner;
Ember.run.begin = runloop.begin;
Ember.run.bind = runloop.bind;
Ember.run.cancel = runloop.cancel;
Ember.run.debounce = runloop.debounce;
Ember.run.end = runloop.end;
Ember.run.hasScheduledTimers = runloop.hasScheduledTimers;
Ember.run.join = runloop.join;
Ember.run.later = runloop.later;
Ember.run.next = runloop.next;
Ember.run.once = runloop.once;
Ember.run.schedule = runloop.schedule;
Ember.run.scheduleOnce = runloop.scheduleOnce;
Ember.run.throttle = runloop.throttle;
Object.defineProperty(Ember.run, 'currentRunLoop', {
  get: runloop.getCurrentRunLoop,
  enumerable: false,
});

// ****ember-metal****

// Using _globalsComputed here so that mutating the function is only available
// in globals builds
const computed = metal._globalsComputed;
Ember.computed = computed;
computed.alias = metal.alias;
Ember.ComputedProperty = metal.ComputedProperty;
Ember.cacheFor = metal.getCachedValueFor;
Ember.merge = metal.merge;
Ember.meta = metal.meta;
Ember.get = metal.get;
Ember.getWithDefault = metal.getWithDefault;
Ember._getPath = metal._getPath;
Ember.set = metal.set;
Ember.trySet = metal.trySet;
Ember.FEATURES = FLAGS.FEATURES;
Ember.FEATURES.isEnabled = EmberDebug.isFeatureEnabled;
Ember._Cache = metal.Cache;
Ember.on = metal.on;
Ember.addListener = metal.addListener;
Ember.removeListener = metal.removeListener;
Ember.sendEvent = metal.sendEvent;
Ember.hasListeners = metal.hasListeners;
Ember.isNone = metal.isNone;
Ember.isEmpty = metal.isEmpty;
Ember.isBlank = metal.isBlank;
Ember.isPresent = metal.isPresent;
Ember.propertyWillChange = metal.propertyWillChange;
Ember.propertyDidChange = metal.propertyDidChange;
Ember.notifyPropertyChange = metal.notifyPropertyChange;
Ember.overrideChains = metal.overrideChains;
Ember.beginPropertyChanges = metal.beginPropertyChanges;
Ember.endPropertyChanges = metal.endPropertyChanges;
Ember.changeProperties = metal.changeProperties;
Ember.platform = {
  defineProperty: true,
  hasPropertyAccessors: true,
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
Ember.destroy = metal.deleteMeta;
Ember.libraries = metal.libraries;
Ember.OrderedSet = metal.OrderedSet;
Ember.Map = metal.Map;
Ember.MapWithDefault = metal.MapWithDefault;
Ember.getProperties = metal.getProperties;
Ember.setProperties = metal.setProperties;
Ember.expandProperties = metal.expandProperties;
Ember.addObserver = metal.addObserver;
Ember.removeObserver = metal.removeObserver;
Ember.aliasMethod = metal.aliasMethod;
Ember.observer = metal.observer;
Ember.mixin = metal.mixin;
Ember.Mixin = metal.Mixin;

/**
  A function may be assigned to `Ember.onerror` to be called when Ember
  internals encounter an error. This is useful for specialized error handling
  and reporting code.

  ```javascript
  import $ from 'jquery';

  Ember.onerror = function(error) {
    $.ajax('/report-error', 'POST', {
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
  get: getOnerror,
  set: setOnerror,
  enumerable: false,
});

Object.defineProperty(Ember, 'testing', {
  get: EmberDebug.isTesting,
  set: EmberDebug.setTesting,
  enumerable: false,
});

Ember._Backburner = Backburner;

// ****ember-console****
Ember.Logger = Logger;

// ****ember-runtime****
Ember.A = A;
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
  the `String.loc` helper. To localize, add string values to this
  hash.

  @property STRINGS
  @for Ember
  @type Object
  @private
*/
Object.defineProperty(Ember, 'STRINGS', {
  configurable: false,
  get: getStrings,
  set: setStrings,
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
  get: metal.isNamespaceSearchDisabled,
  set: metal.setNamespaceSearchDisabled,
});

// ****ember-glimmer****
Ember.Component = Component;
Helper.helper = helper;
Ember.Helper = Helper;
Ember.Checkbox = Checkbox;
Ember.TextField = TextField;
Ember.TextArea = TextArea;
Ember.LinkComponent = LinkComponent;
Ember._setComponentManager = componentManager;
Ember.Handlebars = {
  template,
  Utils: {
    escapeExpression,
  },
};
Ember.HTMLBars = {
  template,
};

if (ENV.EXTEND_PROTOTYPES.String) {
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}
EmberString.htmlSafe = htmlSafe;
EmberString.isHTMLSafe = isHTMLSafe;

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
  enumerable: false,
});

/**
  The semantic version

  @property VERSION
  @type String
  @public
*/
Ember.VERSION = VERSION;

metal.libraries.registerCoreLibrary('Ember', VERSION);

// ****ember-views****
Ember.$ = views.jQuery;
Ember.ViewUtils = {
  isSimpleClick: views.isSimpleClick,
  getViewElement: views.getViewElement,
  getViewBounds: views.getViewBounds,
  getViewClientRects: views.getViewClientRects,
  getViewBoundingClientRect: views.getViewBoundingClientRect,
  getRootViews: views.getRootViews,
  getChildViews: views.getChildViews,
  isSerializationFirstNode: isSerializationFirstNode,
};
Ember.TextSupport = views.TextSupport;
Ember.ComponentLookup = views.ComponentLookup;
Ember.EventDispatcher = views.EventDispatcher;

// ****ember-routing****
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

// ****ember-application****
Ember.ApplicationInstance = application.ApplicationInstance;
Ember.Engine = application.Engine;
Ember.EngineInstance = application.EngineInstance;

runLoadHooks('Ember.Application', Application);

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

export default Ember;

if (IS_NODE) {
  module.exports = Ember;
} else {
  context.exports.Ember = context.exports.Em = Ember;
}

/**
 @module jquery
 @public
 */

/**
 @class jquery
 @public
 @static
 */

/**
  Alias for jQuery

  @for jquery
  @method $
  @static
  @public
*/
