/**
Ember Metal

@module ember
@submodule ember-metal
*/

// BEGIN IMPORTS
import Ember from "ember-metal/core";
import merge from "ember-metal/merge";
import {instrument, subscribe, unsubscribe, reset} from "ember-metal/instrumentation";
import {
  generateGuid,
  GUID_KEY,
  GUID_PREFIX,
  guidFor,
  META_DESC,
  EMPTY_META,
  meta,
  getMeta,
  setMeta,
  metaPath,
  inspect,
  typeOf,
  tryCatchFinally,
  isArray,
  makeArray,
  canInvoke,
  tryInvoke,
  tryFinally,
  wrap,
  apply,
  applyStr
} from "ember-metal/utils";
import EmberError from "ember-metal/error";
import EnumerableUtils from "ember-metal/enumerable_utils";

import {create, platform} from "ember-metal/platform";
import {map, forEach, filter, indexOf} from "ember-metal/array";
import Logger from "ember-metal/logger";

import {get, getWithDefault, normalizeTuple, _getPath} from "ember-metal/property_get";

import {
  on,
  addListener,
  removeListener,
  suspendListener,
  suspendListeners,
  sendEvent,
  hasListeners,
  watchedEvents,
  listenersFor,
  listenersDiff,
  listenersUnion
} from "ember-metal/events";

import ObserverSet from "ember-metal/observer_set";

import {propertyWillChange, propertyDidChange, overrideChains,
beginPropertyChanges, endPropertyChanges, changeProperties} from "ember-metal/property_events";

import {Descriptor, defineProperty} from "ember-metal/properties";
import {set, trySet} from "ember-metal/property_set";

import {OrderedSet, Map, MapWithDefault} from "ember-metal/map";
import getProperties from "ember-metal/get_properties";
import setProperties from "ember-metal/set_properties";
import {watchKey, unwatchKey} from "ember-metal/watch_key";
import {flushPendingChains, removeChainWatcher, ChainNode, finishChains} from "ember-metal/chains";
import {watchPath, unwatchPath} from "ember-metal/watch_path";
import {watch, isWatching, unwatch, rewatch, destroy} from "ember-metal/watching";
import expandProperties from "ember-metal/expand_properties";
import {ComputedProperty, computed, cacheFor} from "ember-metal/computed";

import {addObserver, observersFor, removeObserver, addBeforeObserver, _suspendBeforeObserver, _suspendObserver, _suspendBeforeObservers, _suspendObservers, beforeObserversFor, removeBeforeObserver} from "ember-metal/observer";
import {IS_BINDING, mixin, Mixin, required, aliasMethod, observer, immediateObserver, beforeObserver} from "ember-metal/mixin";
import {Binding, isGlobalPath, bind, oneWay} from "ember-metal/binding";
import run from "ember-metal/run_loop";
import libraries from "ember-metal/libraries";
import {isNone, none} from 'ember-metal/is_none';
import {isEmpty, empty} from 'ember-metal/is_empty';
import isBlank from 'ember-metal/is_blank';
// END IMPORTS

// BEGIN EXPORTS
var EmberInstrumentation = Ember.Instrumentation = {};
EmberInstrumentation.instrument = instrument;
EmberInstrumentation.subscribe = subscribe;
EmberInstrumentation.unsubscribe = unsubscribe;
EmberInstrumentation.reset  = reset;

Ember.instrument = instrument;
Ember.subscribe = subscribe;

Ember.generateGuid    = generateGuid;
Ember.GUID_KEY        = GUID_KEY;
Ember.GUID_PREFIX     = GUID_PREFIX;
Ember.create          = create;
Ember.platform        = platform;

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

Ember.libraries = libraries;
Ember.libraries.registerCoreLibrary('Ember', Ember.VERSION);

Ember.isNone = isNone;
Ember.none = none;

Ember.isEmpty = isEmpty;
Ember.empty = empty;

Ember.isBlank = isBlank;

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
