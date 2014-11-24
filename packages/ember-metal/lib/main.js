/**
Ember Metal

@module ember
@submodule ember-metal
*/

// BEGIN IMPORTS
import Ember from "ember-metal/core";
import merge from "ember-metal/merge";
import {
  instrument,
  reset,
  subscribe,
  unsubscribe
} from "ember-metal/instrumentation";
import {
  EMPTY_META,
  GUID_KEY,
  META_DESC,
  apply,
  applyStr,
  canInvoke,
  generateGuid,
  getMeta,
  guidFor,
  inspect,
  isArray,
  makeArray,
  meta,
  metaPath,
  setMeta,
  tryCatchFinally,
  tryFinally,
  tryInvoke,
  typeOf,
  uuid,
  wrap
} from "ember-metal/utils";
import EmberError from "ember-metal/error";
import EnumerableUtils from "ember-metal/enumerable_utils";
import Cache from "ember-metal/cache";
import {
  create,
  hasPropertyAccessors
} from "ember-metal/platform";
import {
  filter,
  forEach,
  indexOf,
  map
} from "ember-metal/array";
import Logger from "ember-metal/logger";

import {
  _getPath,
  get,
  getWithDefault,
  normalizeTuple
} from "ember-metal/property_get";

import {
  addListener,
  hasListeners,
  listenersDiff,
  listenersFor,
  listenersUnion,
  on,
  removeListener,
  sendEvent,
  suspendListener,
  suspendListeners,
  watchedEvents
} from "ember-metal/events";

import ObserverSet from "ember-metal/observer_set";

import {
  beginPropertyChanges,
  changeProperties,
  endPropertyChanges,
  overrideChains,
  propertyDidChange,
  propertyWillChange
} from "ember-metal/property_events";

import {
  Descriptor,
  defineProperty
} from "ember-metal/properties";
import {
  set,
  trySet
} from "ember-metal/property_set";

import {
  Map,
  MapWithDefault,
  OrderedSet
} from "ember-metal/map";
import getProperties from "ember-metal/get_properties";
import setProperties from "ember-metal/set_properties";
import {
  watchKey,
  unwatchKey
} from "ember-metal/watch_key";
import {
  ChainNode,
  finishChains,
  flushPendingChains,
  removeChainWatcher
} from "ember-metal/chains";
import {
  watchPath,
  unwatchPath
} from "ember-metal/watch_path";
import {
  destroy,
  isWatching,
  rewatch,
  unwatch,
  watch
} from "ember-metal/watching";
import expandProperties from "ember-metal/expand_properties";
import {
  ComputedProperty,
  computed,
  cacheFor
} from "ember-metal/computed";

// side effect of defining the computed.* macros
import "ember-metal/computed_macros";

import {
  _suspendBeforeObserver,
  _suspendBeforeObservers,
  _suspendObserver,
  _suspendObservers,
  addBeforeObserver,
  addObserver,
  beforeObserversFor,
  observersFor,
  removeBeforeObserver,
  removeObserver
} from "ember-metal/observer";
import {
  IS_BINDING,
  Mixin,
  aliasMethod,
  beforeObserver,
  immediateObserver,
  mixin,
  observer,
  required
} from "ember-metal/mixin";
import {
  Binding,
  bind,
  isGlobalPath,
  oneWay
} from "ember-metal/binding";
import run from "ember-metal/run_loop";
import Libraries from "ember-metal/libraries";
import isNone from 'ember-metal/is_none';
import isEmpty from 'ember-metal/is_empty';
import isBlank from 'ember-metal/is_blank';
import isPresent from 'ember-metal/is_present';
import keys from 'ember-metal/keys';

// END IMPORTS

// BEGIN EXPORTS
var EmberInstrumentation = Ember.Instrumentation = {};
EmberInstrumentation.instrument = instrument;
EmberInstrumentation.subscribe = subscribe;
EmberInstrumentation.unsubscribe = unsubscribe;
EmberInstrumentation.reset  = reset;

Ember.instrument = instrument;
Ember.subscribe = subscribe;

Ember._Cache = Cache;

Ember.generateGuid    = generateGuid;
Ember.GUID_KEY        = GUID_KEY;
Ember.create          = create;
Ember.keys            = keys;
Ember.platform        = {
  defineProperty: defineProperty,
  hasPropertyAccessors: hasPropertyAccessors
};

var EmberArrayPolyfills = Ember.ArrayPolyfills = {};

EmberArrayPolyfills.map = map;
EmberArrayPolyfills.forEach = forEach;
EmberArrayPolyfills.filter = filter;
EmberArrayPolyfills.indexOf = indexOf;

Ember.Error           = EmberError;
Ember.guidFor         = guidFor;
Ember.META_DESC       = META_DESC;
Ember.EMPTY_META      = EMPTY_META;
Ember.meta            = meta;
Ember.getMeta         = getMeta;
Ember.setMeta         = setMeta;
Ember.metaPath        = metaPath;
Ember.inspect         = inspect;
Ember.typeOf          = typeOf;
Ember.tryCatchFinally = tryCatchFinally;
Ember.isArray         = isArray;
Ember.makeArray       = makeArray;
Ember.canInvoke       = canInvoke;
Ember.tryInvoke       = tryInvoke;
Ember.tryFinally      = tryFinally;
Ember.wrap            = wrap;
Ember.apply           = apply;
Ember.applyStr        = applyStr;
Ember.uuid            = uuid;

Ember.Logger = Logger;

Ember.get            = get;
Ember.getWithDefault = getWithDefault;
Ember.normalizeTuple = normalizeTuple;
Ember._getPath       = _getPath;

Ember.EnumerableUtils = EnumerableUtils;

Ember.on                = on;
Ember.addListener       = addListener;
Ember.removeListener    = removeListener;
Ember._suspendListener  = suspendListener;
Ember._suspendListeners = suspendListeners;
Ember.sendEvent         = sendEvent;
Ember.hasListeners      = hasListeners;
Ember.watchedEvents     = watchedEvents;
Ember.listenersFor      = listenersFor;
Ember.listenersDiff     = listenersDiff;
Ember.listenersUnion    = listenersUnion;

Ember._ObserverSet = ObserverSet;

Ember.propertyWillChange = propertyWillChange;
Ember.propertyDidChange = propertyDidChange;
Ember.overrideChains = overrideChains;
Ember.beginPropertyChanges = beginPropertyChanges;
Ember.endPropertyChanges = endPropertyChanges;
Ember.changeProperties = changeProperties;

Ember.Descriptor     = Descriptor;
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
Ember.addBeforeObserver = addBeforeObserver;
Ember._suspendBeforeObserver = _suspendBeforeObserver;
Ember._suspendBeforeObservers = _suspendBeforeObservers;
Ember._suspendObserver = _suspendObserver;
Ember._suspendObservers = _suspendObservers;
Ember.beforeObserversFor = beforeObserversFor;
Ember.removeBeforeObserver = removeBeforeObserver;

Ember.IS_BINDING = IS_BINDING;
Ember.required = required;
Ember.aliasMethod = aliasMethod;
Ember.observer = observer;
Ember.immediateObserver = immediateObserver;
Ember.beforeObserver = beforeObserver;
Ember.mixin = mixin;
Ember.Mixin = Mixin;

Ember.oneWay = oneWay;
Ember.bind = bind;
Ember.Binding = Binding;
Ember.isGlobalPath = isGlobalPath;

Ember.run = run;

Ember.libraries = new Libraries();
Ember.libraries.registerCoreLibrary('Ember', Ember.VERSION);

Ember.isNone = isNone;
Ember.isEmpty = isEmpty;
Ember.isBlank = isBlank;

if (Ember.FEATURES.isEnabled('ember-metal-is-present')) {
  Ember.isPresent = isPresent;
}

Ember.merge = merge;

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
*/
Ember.onerror = null;
// END EXPORTS

// do this for side-effects of updating Ember.assert, warn, etc when
// ember-debug is present
if (Ember.__loader.registry['ember-debug']) {
  requireModule('ember-debug');
}

export default Ember;
