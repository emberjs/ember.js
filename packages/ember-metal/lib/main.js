/**
@module ember
@submodule ember-metal
*/

// BEGIN IMPORTS
import Ember from 'ember-metal/core';
import { deprecateFunc } from 'ember-metal/debug';
import isEnabled, { FEATURES } from 'ember-metal/features';
import merge from 'ember-metal/merge';
import {
  instrument,
  reset as instrumentationReset,
  subscribe as instrumentationSubscribe,
  unsubscribe as instrumentationUnsubscribe
} from 'ember-metal/instrumentation';
import {
  GUID_KEY,
  apply,
  applyStr,
  canInvoke,
  generateGuid,
  guidFor,
  inspect,
  makeArray,
  deprecatedTryCatchFinally,
  tryInvoke,
  uuid,
  wrap
} from 'ember-metal/utils';
import {
  EMPTY_META,
  META_DESC,
  meta
} from 'ember-metal/meta';
import EmberError from 'ember-metal/error';
import Cache from 'ember-metal/cache';
import Logger from 'ember-metal/logger';

import {
  _getPath,
  get,
  getWithDefault,
  normalizeTuple
} from 'ember-metal/property_get';

import {
  accumulateListeners,
  addListener,
  hasListeners,
  listenersFor,
  on,
  removeListener,
  sendEvent,
  suspendListener,
  suspendListeners,
  watchedEvents
} from 'ember-metal/events';

import ObserverSet from 'ember-metal/observer_set';

import {
  beginPropertyChanges,
  changeProperties,
  endPropertyChanges,
  overrideChains,
  propertyDidChange,
  propertyWillChange
} from 'ember-metal/property_events';

import {
  defineProperty
} from 'ember-metal/properties';
import {
  set,
  trySet
} from 'ember-metal/property_set';

import {
  Map,
  MapWithDefault,
  OrderedSet
} from 'ember-metal/map';
import getProperties from 'ember-metal/get_properties';
import setProperties from 'ember-metal/set_properties';
import {
  watchKey,
  unwatchKey
} from 'ember-metal/watch_key';
import {
  ChainNode,
  finishChains,
  flushPendingChains,
  removeChainWatcher
} from 'ember-metal/chains';
import {
  watchPath,
  unwatchPath
} from 'ember-metal/watch_path';
import {
  destroy,
  isWatching,
  rewatch,
  unwatch,
  watch
} from 'ember-metal/watching';
import expandProperties from 'ember-metal/expand_properties';
import {
  ComputedProperty,
  computed,
  cacheFor
} from 'ember-metal/computed';

import alias from 'ember-metal/alias';
import {
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
  oneWay as computedOneWay,
  readOnly,
  defaultTo,
  deprecatingAlias,
  and,
  or,
  any,
  collect
} from 'ember-metal/computed_macros';

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
computed.alias = alias;
computed.oneWay = computedOneWay;
computed.reads = computedOneWay;
computed.readOnly = readOnly;
computed.defaultTo = defaultTo;
computed.deprecatingAlias = deprecatingAlias;
computed.and = and;
computed.or = or;
computed.any = any;
computed.collect = collect;

import {
  _suspendObserver,
  _suspendObservers,
  addObserver,
  observersFor,
  removeObserver
} from 'ember-metal/observer';
import {
  IS_BINDING,
  Mixin,
  aliasMethod,
  _immediateObserver,
  mixin,
  observer,
  required
} from 'ember-metal/mixin';
import {
  Binding,
  bind,
  isGlobalPath
} from 'ember-metal/binding';
import run from 'ember-metal/run_loop';
import Libraries from 'ember-metal/libraries';
import isNone from 'ember-metal/is_none';
import isEmpty from 'ember-metal/is_empty';
import isBlank from 'ember-metal/is_blank';
import isPresent from 'ember-metal/is_present';
import Backburner from 'backburner';

// END IMPORTS

// BEGIN EXPORTS
var EmberInstrumentation = Ember.Instrumentation = {};
EmberInstrumentation.instrument = instrument;
EmberInstrumentation.subscribe = instrumentationSubscribe;
EmberInstrumentation.unsubscribe = instrumentationUnsubscribe;
EmberInstrumentation.reset  = instrumentationReset;

Ember.instrument = instrument;
Ember.subscribe = instrumentationSubscribe;

Ember._Cache = Cache;

Ember.generateGuid    = generateGuid;
Ember.GUID_KEY        = GUID_KEY;
Ember.platform        = {
  defineProperty: true,
  hasPropertyAccessors: true
};

Ember.Error           = EmberError;
Ember.guidFor         = guidFor;
Ember.META_DESC       = META_DESC;
Ember.EMPTY_META      = EMPTY_META;
Ember.meta            = meta;
Ember.inspect         = inspect;
Ember.tryCatchFinally = deprecatedTryCatchFinally;
Ember.makeArray       = makeArray;
Ember.canInvoke       = canInvoke;
Ember.tryInvoke       = tryInvoke;
Ember.wrap            = wrap;
Ember.apply           = apply;
Ember.applyStr        = applyStr;
Ember.uuid            = uuid;

Ember.Logger = Logger;

Ember.get            = get;
Ember.getWithDefault = getWithDefault;
Ember.normalizeTuple = normalizeTuple;
Ember._getPath       = _getPath;

Ember.on                  = on;
Ember.addListener         = addListener;
Ember.removeListener      = removeListener;
Ember._suspendListener    = suspendListener;
Ember._suspendListeners   = suspendListeners;
Ember.sendEvent           = sendEvent;
Ember.hasListeners        = hasListeners;
Ember.watchedEvents       = watchedEvents;
Ember.listenersFor        = listenersFor;
Ember.accumulateListeners = accumulateListeners;

Ember._ObserverSet = ObserverSet;

Ember.propertyWillChange = propertyWillChange;
Ember.propertyDidChange = propertyDidChange;
Ember.overrideChains = overrideChains;
Ember.beginPropertyChanges = beginPropertyChanges;
Ember.endPropertyChanges = endPropertyChanges;
Ember.changeProperties = changeProperties;

Ember.defineProperty = defineProperty;

Ember.set    = set;
Ember.trySet = trySet;

Ember.OrderedSet = OrderedSet;
Ember.Map = Map;
Ember.MapWithDefault = MapWithDefault;

Ember.getProperties = getProperties;
Ember.setProperties = setProperties;

Ember.watchKey   = watchKey;
Ember.unwatchKey = unwatchKey;

Ember.flushPendingChains = flushPendingChains;
Ember.removeChainWatcher = removeChainWatcher;
Ember._ChainNode = ChainNode;
Ember.finishChains = finishChains;

Ember.watchPath = watchPath;
Ember.unwatchPath = unwatchPath;

Ember.watch = watch;
Ember.isWatching = isWatching;
Ember.unwatch = unwatch;
Ember.rewatch = rewatch;
Ember.destroy = destroy;

Ember.expandProperties = expandProperties;

Ember.ComputedProperty = ComputedProperty;
Ember.computed = computed;
Ember.cacheFor = cacheFor;

Ember.addObserver = addObserver;
Ember.observersFor = observersFor;
Ember.removeObserver = removeObserver;
Ember._suspendObserver = _suspendObserver;
Ember._suspendObservers = _suspendObservers;

Ember.IS_BINDING = IS_BINDING;
Ember.required = required;
Ember.aliasMethod = aliasMethod;
Ember.observer = observer;
Ember.immediateObserver = _immediateObserver;
Ember.mixin = mixin;
Ember.Mixin = Mixin;

Ember.bind = bind;
Ember.Binding = Binding;
Ember.isGlobalPath = isGlobalPath;

Ember.run = run;

/**
@class Backburner
@for Ember
@private
*/
Ember.Backburner = Backburner;
// this is the new go forward, once Ember Data updates to using `_Backburner` we
// can remove the non-underscored version.
Ember._Backburner = Backburner;

Ember.libraries = new Libraries();
Ember.libraries.registerCoreLibrary('Ember', Ember.VERSION);

Ember.isNone = isNone;
Ember.isEmpty = isEmpty;
Ember.isBlank = isBlank;
Ember.isPresent = isPresent;

Ember.merge = merge;

Ember.FEATURES = FEATURES;
Ember.FEATURES.isEnabled = isEnabled;

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
Ember.onerror = null;
// END EXPORTS

// do this for side-effects of updating Ember.assert, warn, etc when
// ember-debug is present
// This needs to be called before any deprecateFunc
if (Ember.__loader.registry['ember-debug']) {
  requireModule('ember-debug');
} else {
  Ember.Debug = { };

  if (isEnabled('ember-debug-handlers')) {
    Ember.Debug.registerDeprecationHandler = function() { };
    Ember.Debug.registerWarnHandler = function() { };
  }
}

Ember.create = deprecateFunc('Ember.create is deprecated in favor of Object.create', { id: 'ember-metal.ember-create', until: '3.0.0' }, Object.create);
Ember.keys = deprecateFunc('Ember.keys is deprecated in favor of Object.keys', { id: 'ember-metal.ember.keys', until: '3.0.0' }, Object.keys);

export default Ember;
