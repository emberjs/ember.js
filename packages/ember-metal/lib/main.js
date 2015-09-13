/**
@module ember
@submodule ember-metal
*/

// BEGIN IMPORTS
import Ember from 'ember-metal/core';
import { deprecateFunc } from 'ember-metal/debug';
import isEnabled, { FEATURES } from 'ember-metal/features';
import {
  instrument,
  reset as instrumentationReset,
  subscribe as instrumentationSubscribe,
  unsubscribe as instrumentationUnsubscribe
} from 'ember-metal/instrumentation';
import Cache from 'ember-metal/cache';

var reexport = Ember.__reexport;

reexport('ember-metal/computed', 'computed');
import Libraries from 'ember-metal/libraries';

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

Ember.platform = {
  defineProperty: true,
  hasPropertyAccessors: true
};

var reexport = Ember.__reexport;

reexport('ember-metal/error', [['default', 'Error']]);
reexport('ember-metal/meta', ['EMPTY_META', 'META_DESC', 'meta']);
reexport('ember-metal/utils', [
  'GUID_KEY',
  'guidFor',
  'inspect',
  'apply',
  'applyStr',
  'canInvoke',
  'tryInovke',
  'generateGuid',
  ['deprecatedTryCatchFinally', 'tryCatchFinally'],
  'makeArray',
  'uuid',
  'wrap'
]);

reexport('ember-metal/logger', [['default', 'Logger']]);
reexport('ember-metal/property_get', ['get', '_getPath', 'getWithDefault', 'normalizeTuple']);

reexport('ember-metal/events', [
  'on',
  'addListener',
  'removeListener',
  'suspendListener',
  'suspendListeners',
  'sendEvent',
  'hasListeners',
  'watchedEvents',
  'listenersFor',
  'accumulateListeners'
]);

reexport('ember-metal/observer_set', [['default', '_ObserverSet']]);

reexport('ember-metal/property_events', [
  'propertyWillChange',
  'propertyDidChange',
  'overrideChains',
  'beginPropertyChanges',
  'endPropertyChanges',
  'changeProperties'
]);

reexport('ember-metal/properties', ['defineProperty']);

reexport('ember-metal/property_set', [
  'set',
  'trySet'
]);

reexport('ember-metal/map', [
  'OrderedSet',
  'Map',
  'MapWithDefault'
]);

reexport('ember-metal/get_properties', 'getProperties');
reexport('ember-metal/set_properties', 'setProperties');

reexport('ember-metal/watch_key', [
  'watchKey',
  'unwatchKey'
]);

reexport('ember-metal/chains', [
  'flushPendingChains',
  'removeChainWatcher',
  ['_ChainNode', 'ChainNode'],
  'finishChains'
]);

reexport('ember-metal/watch_path', [
  'watchPath',
  'unwatchPath'
]);

reexport('ember-metal/watching', [
  'watch',
  'isWatching',
  'unwatch',
  'rewatch',
  'destroy'
]);

reexport('ember-metal/expand_properties', 'expandProperties');

reexport('ember-metal/computed', [
  'ComputedProperty',
  'cacheFor'
]);

reexport('ember-metal/observer', [
  'addObserver',
  'observersFor',
  'removeObserver',
  'addBeforeObserver',
  '_suspendBeforeObserver',
  '_suspendBeforeObservers',
  '_suspendObserver',
  '_suspendObservers',
  'beforeObserversFor',
  'removeBeforeObserver'
]);

reexport('ember-metal/mixin', [
  'IS_BINDING',
  'required',
  'aliasMethod',
  'observer',
  'immediateObserver',
  'beforeObserver',
  'mixin',
  'Mixin'
]);

reexport('ember-metal/binding', [
  'oneWay',
  'bind',
  'Binding',
  'isGlobalPath'
]);

/**
@class Backburner
@for Ember
@private
*/
reexport('backburner', 'Backburner');
// this is the new go forward, once Ember Data updates to using `_Backburner` we
// can remove the non-underscored version.
reexport('backburner', '_Backburner');

Ember.libraries = new Libraries();
Ember.libraries.registerCoreLibrary('Ember', Ember.VERSION);

reexport('ember-metal/run_loop', 'run');
reexport('ember-metal/is_none', 'isNone');
reexport('ember-metal/is_empty', 'isEmpty');
reexport('ember-metal/is_blank', 'isBlank');
reexport('ember-metal/is_present', 'isPresent');
reexport('ember-metal/merge', 'merge');

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
