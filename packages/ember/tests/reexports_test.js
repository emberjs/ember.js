import Ember from '../index';
import { FEATURES } from '@ember/canary-features';
import { AbstractTestCase, confirmExport, moduleFor } from 'internal-test-helpers';
import { DEBUG } from '@glimmer/env';

moduleFor(
  'ember reexports',
  class extends AbstractTestCase {
    [`@test Ember exports correctly`](assert) {
      allExports.forEach((reexport) => {
        let [path, moduleId, exportName] = reexport;

        // default path === exportName if none present
        if (!exportName) {
          exportName = path;
        }

        confirmExport(Ember, assert, path, moduleId, exportName);
      });
    }

    '@test Ember.FEATURES is exported'(assert) {
      if (Object.keys(FEATURES).length === 0) {
        assert.expect(0);
      }

      for (let feature in FEATURES) {
        assert.equal(
          Ember.FEATURES[feature],
          FEATURES[feature],
          'Ember.FEATURES contains ${feature} with correct value'
        );
      }
    }
  }
);

let allExports = [
  // @ember/application
  ['Application', '@ember/application', 'default'],
  ['getOwner', '@ember/application', 'getOwner'],
  ['onLoad', '@ember/application', 'onLoad'],
  ['runLoadHooks', '@ember/application', 'runLoadHooks'],
  ['setOwner', '@ember/application', 'setOwner'],

  // @ember/application/instance
  ['ApplicationInstance', '@ember/application/instance', 'default'],

  // @ember/application/namespace
  ['Namespace', '@ember/application/namespace', 'default'],

  // @ember/array
  ['Array', '@ember/array', 'default'],
  ['A', '@ember/array', 'A'],
  ['NativeArray', '@ember/array', 'NativeArray'],
  ['isArray', '@ember/array', 'isArray'],
  ['makeArray', '@ember/array', 'makeArray'],

  // @ember/array/mutable
  ['MutableArray', '@ember/array/mutable', 'default'],

  // @ember/array/proxy
  ['ArrayProxy', '@ember/array/proxy', 'default'],

  // @ember/canary-features
  ['FEATURES.isEnabled', '@ember/canary-features', 'isEnabled'],

  // @ember/component
  ['Component', '@ember/component', 'default'],
  ['_componentManagerCapabilities', '@ember/component', 'capabilities'],
  ['_getComponentTemplate', '@ember/component', 'getComponentTemplate'],
  ['_setComponentManager', '@ember/component', 'setComponentManager'],
  ['_setComponentTemplate', '@ember/component', 'setComponentTemplate'],

  // @ember/component/helper
  ['Helper', '@ember/component/helper', 'default'],
  ['Helper.helper', '@ember/component/helper', 'helper'],

  // @ember/component/template-only
  ['_templateOnlyComponent', '@ember/component/template-only', 'default'],

  // @ember/controller
  ['Controller', '@ember/controller', 'default'],
  ['ControllerMixin', '@ember/controller', 'ControllerMixin'],
  ['inject.controller', '@ember/controller', 'inject'],

  // @ember/debug
  ['deprecateFunc', '@ember/debug', 'deprecateFunc'],
  ['deprecate', '@ember/debug', 'deprecate'],
  ['assert', '@ember/debug', 'assert'],
  ['debug', '@ember/debug', 'debug'],
  ['inspect', '@ember/debug', 'inspect'],
  ['Debug.registerDeprecationHandler', '@ember/debug', 'registerDeprecationHandler'],
  ['Debug.registerWarnHandler', '@ember/debug', 'registerWarnHandler'],
  ['runInDebug', '@ember/debug', 'runInDebug'],
  ['warn', '@ember/debug', 'warn'],
  ['testing', '@ember/debug', { get: 'isTesting', set: 'setTesting' }],
  ['_captureRenderTree', '@ember/debug', 'captureRenderTree'],

  // @ember/debug/container-debug-adapter
  ['ContainerDebugAdapter', '@ember/debug/container-debug-adapter', 'default'],

  // @ember/debug/data-adapter
  ['DataAdapter', '@ember/debug/data-adapter', 'default'],

  // @ember/destroyable
  DEBUG
    ? ['_assertDestroyablesDestroyed', '@ember/destroyable', 'assertDestroyablesDestroyed']
    : null,
  ['_associateDestroyableChild', '@ember/destroyable', 'associateDestroyableChild'],
  ['destroy', '@ember/destroyable', 'destroy'],
  DEBUG ? ['_enableDestroyableTracking', '@ember/destroyable', 'enableDestroyableTracking'] : null,
  ['_isDestroyed', '@ember/destroyable', 'isDestroyed'],
  ['_isDestroying', '@ember/destroyable', 'isDestroying'],
  ['_registerDestructor', '@ember/destroyable', 'registerDestructor'],
  ['_unregisterDestructor', '@ember/destroyable', 'unregisterDestructor'],

  // @ember/engine
  ['Engine', '@ember/engine', 'default'],

  // @ember/engine/instance
  ['EngineInstance', '@ember/engine/instance', 'default'],

  // @ember/enumerable
  ['Enumerable', '@ember/enumerable', 'default'],

  // @ember/instrumentation
  ['instrument', '@ember/instrumentation', 'instrument'],
  ['subscribe', '@ember/instrumentation', 'subscribe'],
  ['Instrumentation.instrument', '@ember/instrumentation', 'instrument'],
  ['Instrumentation.reset', '@ember/instrumentation', 'reset'],
  ['Instrumentation.subscribe', '@ember/instrumentation', 'subscribe'],
  ['Instrumentation.unsubscribe', '@ember/instrumentation', 'unsubscribe'],

  // @ember/modifier
  ['_modifierManagerCapabilities', '@ember/modifier', 'capabilities'],
  ['_setModifierManager', '@ember/modifier', 'setModifierManager'],
  ['_on', '@ember/modifier', 'on'],

  // @ember/helper
  ['_helperManagerCapabilities', '@ember/helper', 'capabilities'],
  ['_setHelperManager', '@ember/helper', 'setHelperManager'],
  ['_invokeHelper', '@ember/helper', 'invokeHelper'],
  ['_fn', '@ember/helper', 'fn'],
  ['_array', '@ember/helper', 'array'],
  ['_hash', '@ember/helper', 'hash'],
  ['_get', '@ember/helper', 'get'],
  ['_concat', '@ember/helper', 'concat'],

  // @ember/object
  ['Object', '@ember/object', 'default'],
  ['_action', '@ember/object', 'action'],
  ['computed', '@ember/object', 'computed'],
  ['defineProperty', '@ember/object', 'defineProperty'],
  ['get', '@ember/object', 'get'],
  ['getProperties', '@ember/object', 'getProperties'],
  ['notifyPropertyChange', '@ember/object', 'notifyPropertyChange'],
  ['observer', '@ember/object', 'observer'],
  ['set', '@ember/object', 'set'],
  ['setProperties', '@ember/object', 'setProperties'],
  ['trySet', '@ember/object', 'trySet'],

  // @ember/object/compat
  ['_dependentKeyCompat', '@ember/object/compat', 'dependentKeyCompat'],

  // @ember/object/computed
  ['ComputedProperty', '@ember/object/computed', 'default'],
  ['expandProperties', '@ember/object/computed', 'expandProperties'],

  // @ember/object/core
  ['CoreObject', '@ember/object/core', 'default'],

  // @ember/object/evented
  ['Evented', '@ember/object/evented', 'default'],
  ['on', '@ember/object/evented', 'on'],

  // @ember/object/events
  ['addListener', '@ember/object/events', 'addListener'],
  ['removeListener', '@ember/object/events', 'removeListener'],
  ['sendEvent', '@ember/object/events', 'sendEvent'],

  // @ember/object/internals
  ['cacheFor', '@ember/object/internals', 'cacheFor'],
  ['guidFor', '@ember/object/internals', 'guidFor'],

  // @ember/object/mixin
  ['Mixin', '@ember/object/mixin', 'default'],

  // @ember/object/observable
  ['Observable', '@ember/object/observable', 'default'],

  // @ember/object/observers
  ['addObserver', '@ember/object/observers', 'addObserver'],
  ['removeObserver', '@ember/object/observers', 'removeObserver'],

  // @ember/object/promise-proxy-mixin
  ['PromiseProxyMixin', '@ember/object/promise-proxy-mixin', 'default'],

  // @ember/object/proxy
  ['ObjectProxy', '@ember/object/proxy', 'default'],

  // @ember/routing/hash-location
  ['HashLocation', '@ember/routing/hash-location', 'default'],

  // @ember/routing/history-location
  ['HistoryLocation', '@ember/routing/history-location', 'default'],

  // @ember/routing/none-location
  ['NoneLocation', '@ember/routing/none-location', 'default'],

  // @ember/routing/route
  ['Route', '@ember/routing/route', 'default'],

  // @ember/routing/router
  ['Router', '@ember/routing/router', 'default'],

  // @ember/runloop
  ['run', '@ember/runloop', 'run'],

  // @ember/service
  ['Service', '@ember/service', 'default'],
  ['inject.service', '@ember/service', 'service'],

  // @ember/template
  [null, '@ember/template', 'htmlSafe'],
  [null, '@ember/template', 'isHTMLSafe'],

  // @ember/template-compilation
  ['HTMLBars.compile', '@ember/template-compilation', 'compileTemplate'],

  // @ember/template-factory
  ['Handlebars.template', '@ember/template-factory', 'createTemplateFactory'],
  ['HTMLBars.template', '@ember/template-factory', 'createTemplateFactory'],

  // @ember/test
  ['Test.registerAsyncHelper', '@ember/test', 'registerAsyncHelper'],
  ['Test.registerHelper', '@ember/test', 'registerHelper'],
  ['Test.registerWaiter', '@ember/test', 'registerWaiter'],
  ['Test.unregisterHelper', '@ember/test', 'unregisterHelper'],
  ['Test.unregisterWaiter', '@ember/test', 'unregisterWaiter'],

  // @ember/test/adapter
  ['Test.Adapter', '@ember/test/adapter', 'default'],

  // @ember/utils
  ['compare', '@ember/utils', 'compare'],
  ['isBlank', '@ember/utils', 'isBlank'],
  ['isEmpty', '@ember/utils', 'isEmpty'],
  ['isEqual', '@ember/utils', 'isEqual'],
  ['isNone', '@ember/utils', 'isNone'],
  ['isPresent', '@ember/utils', 'isPresent'],
  ['typeOf', '@ember/utils', 'typeOf'],

  // @ember/version
  ['VERSION', '@ember/version', 'VERSION'],

  // @glimmer/tracking
  ['_tracked', '@glimmer/tracking', 'tracked'],

  // @glimmer/tracking/primitives/cache
  ['_createCache', '@glimmer/tracking/primitives/cache', 'createCache'],
  ['_cacheGetValue', '@glimmer/tracking/primitives/cache', 'getValue'],
  ['_cacheIsConst', '@glimmer/tracking/primitives/cache', 'isConst'],

  // @ember/-internals/environment
  ['ENV', '@ember/-internals/environment', { get: 'getENV' }],
  ['lookup', '@ember/-internals/environment', { get: 'getLookup', set: 'setLookup' }],

  // @ember/-internals/utils
  ['GUID_KEY', '@ember/-internals/utils'],
  ['uuid', '@ember/-internals/utils'],
  ['generateGuid', '@ember/-internals/utils'],
  ['canInvoke', '@ember/-internals/utils'],
  ['wrap', '@ember/-internals/utils'],
  ['_Cache', '@ember/-internals/utils', 'Cache'],

  // @ember/-internals/container
  ['Registry', '@ember/-internals/container', 'Registry'],
  ['Container', '@ember/-internals/container', 'Container'],

  // @ember/-internals/metal
  ['_descriptor', '@ember/-internals/metal', 'nativeDescDecorator'],
  ['_setClassicDecorator', '@ember/-internals/metal', 'setClassicDecorator'],
  ['_getPath', '@ember/-internals/metal'],
  ['hasListeners', '@ember/-internals/metal'],
  ['beginPropertyChanges', '@ember/-internals/metal'],
  ['endPropertyChanges', '@ember/-internals/metal'],
  ['changeProperties', '@ember/-internals/metal'],
  ['libraries', '@ember/-internals/metal'],
  [
    'BOOTED',
    '@ember/-internals/metal',
    { get: 'isNamespaceSearchDisabled', set: 'setNamespaceSearchDisabled' },
  ],

  // @ember/-internals/error-handling
  ['onerror', '@ember/-internals/error-handling', { get: 'getOnerror', set: 'setOnerror' }],

  // @ember/-internals/meta
  ['meta', '@ember/-internals/meta'],

  // @ember/-internals/views
  ['ViewUtils.isSimpleClick', '@ember/-internals/views', 'isSimpleClick'],
  ['ViewUtils.getElementView', '@ember/-internals/views', 'getElementView'],
  ['ViewUtils.getViewElement', '@ember/-internals/views', 'getViewElement'],
  ['ViewUtils.getViewBounds', '@ember/-internals/views', 'getViewBounds'],
  ['ViewUtils.getViewClientRects', '@ember/-internals/views', 'getViewClientRects'],
  ['ViewUtils.getViewBoundingClientRect', '@ember/-internals/views', 'getViewBoundingClientRect'],
  ['ViewUtils.getRootViews', '@ember/-internals/views', 'getRootViews'],
  ['ViewUtils.getChildViews', '@ember/-internals/views', 'getChildViews'],
  ['ViewUtils.isSerializationFirstNode', '@ember/-internals/glimmer', 'isSerializationFirstNode'],
  ['ComponentLookup', '@ember/-internals/views'],
  ['EventDispatcher', '@ember/-internals/views'],

  // @ember/-internals/glimmer
  ['TEMPLATES', '@ember/-internals/glimmer', { get: 'getTemplates', set: 'setTemplates' }],
  ['Handlebars.Utils.escapeExpression', '@ember/-internals/glimmer', 'escapeExpression'],
  ['_Input', '@ember/-internals/glimmer', 'Input'],

  // @ember/-internals/runtime
  ['_RegistryProxyMixin', '@ember/-internals/runtime', 'RegistryProxyMixin'],
  ['_ContainerProxyMixin', '@ember/-internals/runtime', 'ContainerProxyMixin'],
  ['Comparable', '@ember/-internals/runtime'],
  ['ActionHandler', '@ember/-internals/runtime'],
  ['MutableEnumerable', '@ember/-internals/runtime'],
  ['_ProxyMixin', '@ember/-internals/runtime'],

  // @ember/-internals/routing
  ['controllerFor', '@ember/-internals/routing'],
  ['generateControllerFactory', '@ember/-internals/routing'],
  ['generateController', '@ember/-internals/routing'],
  ['RouterDSL', '@ember/-internals/routing'],

  // backburner
  ['_Backburner', 'backburner.js', 'default'],

  // rsvp
  [null, 'rsvp', 'default'],
  [null, 'rsvp', 'Promise'],
  [null, 'rsvp', 'all'],
  [null, 'rsvp', 'allSettled'],
  [null, 'rsvp', 'defer'],
  [null, 'rsvp', 'denodeify'],
  [null, 'rsvp', 'filter'],
  [null, 'rsvp', 'hash'],
  [null, 'rsvp', 'hashSettled'],
  [null, 'rsvp', 'map'],
  [null, 'rsvp', 'off'],
  [null, 'rsvp', 'on'],
  [null, 'rsvp', 'race'],
  [null, 'rsvp', 'reject'],
  [null, 'rsvp', 'resolve'],
].filter(Boolean);
