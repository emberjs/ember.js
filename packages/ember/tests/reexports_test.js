import Ember from '../index';
import { FEATURES } from '@ember/canary-features';
import { AbstractTestCase, confirmExport, moduleFor } from 'internal-test-helpers';
import { DEBUG } from '@glimmer/env';

moduleFor(
  'ember reexports',
  class extends AbstractTestCase {
    async [`@test Ember exports correctly`](assert) {
      for (let reexport of allExports) {
        let [path, modulePromise, exportName] = reexport;

        // default path === exportName if none present
        if (!exportName) {
          exportName = path;
        }

        let module = await modulePromise;
        confirmExport(Ember, assert, path, module, exportName);
      }
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
  ['Application', import('@ember/application'), 'default'],
  ['getOwner', import('@ember/application'), 'getOwner'],
  ['onLoad', import('@ember/application'), 'onLoad'],
  ['runLoadHooks', import('@ember/application'), 'runLoadHooks'],
  ['setOwner', import('@ember/application'), 'setOwner'],

  // @ember/application/instance
  ['ApplicationInstance', import('@ember/application/instance'), 'default'],

  // @ember/application/namespace
  ['Namespace', import('@ember/application/namespace'), 'default'],

  // @ember/array
  ['Array', import('@ember/array'), 'default'],
  ['A', import('@ember/array'), 'A'],
  ['NativeArray', import('@ember/array'), 'NativeArray'],
  ['isArray', import('@ember/array'), 'isArray'],
  ['makeArray', import('@ember/array'), 'makeArray'],

  // @ember/array/mutable
  ['MutableArray', import('@ember/array/mutable'), 'default'],

  // @ember/array/proxy
  ['ArrayProxy', import('@ember/array/proxy'), 'default'],

  // @ember/canary-features
  ['FEATURES.isEnabled', import('@ember/canary-features'), 'isEnabled'],

  // @ember/component
  ['Component', import('@ember/component'), 'default'],
  ['_componentManagerCapabilities', import('@ember/component'), 'capabilities'],
  ['_getComponentTemplate', import('@ember/component'), 'getComponentTemplate'],
  ['_setComponentManager', import('@ember/component'), 'setComponentManager'],
  ['_setComponentTemplate', import('@ember/component'), 'setComponentTemplate'],

  // @ember/component/helper
  ['Helper', import('@ember/component/helper'), 'default'],
  ['Helper.helper', import('@ember/component/helper'), 'helper'],

  // @ember/component/template-only
  ['_templateOnlyComponent', import('@ember/component/template-only'), 'default'],

  // @ember/controller
  ['Controller', import('@ember/controller'), 'default'],
  ['ControllerMixin', import('@ember/controller'), 'ControllerMixin'],
  ['inject.controller', import('@ember/controller'), 'inject'],

  // @ember/debug
  ['deprecateFunc', import('@ember/debug'), 'deprecateFunc'],
  ['deprecate', import('@ember/debug'), 'deprecate'],
  ['assert', import('@ember/debug'), 'assert'],
  ['debug', import('@ember/debug'), 'debug'],
  ['inspect', import('@ember/debug'), 'inspect'],
  ['Debug.registerDeprecationHandler', import('@ember/debug'), 'registerDeprecationHandler'],
  ['Debug.registerWarnHandler', import('@ember/debug'), 'registerWarnHandler'],
  ['runInDebug', import('@ember/debug'), 'runInDebug'],
  ['warn', import('@ember/debug'), 'warn'],
  ['testing', import('@ember/debug'), { get: 'isTesting', set: 'setTesting' }],
  ['_captureRenderTree', import('@ember/debug'), 'captureRenderTree'],

  // @ember/debug/container-debug-adapter
  ['ContainerDebugAdapter', import('@ember/debug/container-debug-adapter'), 'default'],

  // @ember/debug/data-adapter
  ['DataAdapter', import('@ember/debug/data-adapter'), 'default'],

  // @ember/destroyable
  DEBUG
    ? ['_assertDestroyablesDestroyed', import('@ember/destroyable'), 'assertDestroyablesDestroyed']
    : null,
  ['_associateDestroyableChild', import('@ember/destroyable'), 'associateDestroyableChild'],
  ['destroy', import('@ember/destroyable'), 'destroy'],
  DEBUG
    ? ['_enableDestroyableTracking', import('@ember/destroyable'), 'enableDestroyableTracking']
    : null,
  ['_isDestroyed', import('@ember/destroyable'), 'isDestroyed'],
  ['_isDestroying', import('@ember/destroyable'), 'isDestroying'],
  ['_registerDestructor', import('@ember/destroyable'), 'registerDestructor'],
  ['_unregisterDestructor', import('@ember/destroyable'), 'unregisterDestructor'],

  // @ember/engine
  ['Engine', import('@ember/engine'), 'default'],

  // @ember/engine/instance
  ['EngineInstance', import('@ember/engine/instance'), 'default'],

  // @ember/enumerable
  ['Enumerable', import('@ember/enumerable'), 'default'],

  // @ember/instrumentation
  ['instrument', import('@ember/instrumentation'), 'instrument'],
  ['subscribe', import('@ember/instrumentation'), 'subscribe'],
  ['Instrumentation.instrument', import('@ember/instrumentation'), 'instrument'],
  ['Instrumentation.reset', import('@ember/instrumentation'), 'reset'],
  ['Instrumentation.subscribe', import('@ember/instrumentation'), 'subscribe'],
  ['Instrumentation.unsubscribe', import('@ember/instrumentation'), 'unsubscribe'],

  // @ember/modifier
  ['_modifierManagerCapabilities', import('@ember/modifier'), 'capabilities'],
  ['_setModifierManager', import('@ember/modifier'), 'setModifierManager'],
  ['_on', import('@ember/modifier'), 'on'],

  // @ember/helper
  ['_helperManagerCapabilities', import('@ember/helper'), 'capabilities'],
  ['_setHelperManager', import('@ember/helper'), 'setHelperManager'],
  ['_invokeHelper', import('@ember/helper'), 'invokeHelper'],
  ['_fn', import('@ember/helper'), 'fn'],
  ['_array', import('@ember/helper'), 'array'],
  ['_hash', import('@ember/helper'), 'hash'],
  ['_get', import('@ember/helper'), 'get'],
  ['_concat', import('@ember/helper'), 'concat'],

  // @ember/object
  ['Object', import('@ember/object'), 'default'],
  ['_action', import('@ember/object'), 'action'],
  ['computed', import('@ember/object'), 'computed'],
  ['defineProperty', import('@ember/object'), 'defineProperty'],
  ['get', import('@ember/object'), 'get'],
  ['getProperties', import('@ember/object'), 'getProperties'],
  ['notifyPropertyChange', import('@ember/object'), 'notifyPropertyChange'],
  ['observer', import('@ember/object'), 'observer'],
  ['set', import('@ember/object'), 'set'],
  ['setProperties', import('@ember/object'), 'setProperties'],
  ['trySet', import('@ember/object'), 'trySet'],

  // @ember/object/compat
  ['_dependentKeyCompat', import('@ember/object/compat'), 'dependentKeyCompat'],

  // @ember/object/computed
  ['ComputedProperty', import('@ember/object/computed'), 'default'],
  ['expandProperties', import('@ember/object/computed'), 'expandProperties'],

  // @ember/object/core
  ['CoreObject', import('@ember/object/core'), 'default'],

  // @ember/object/evented
  ['Evented', import('@ember/object/evented'), 'default'],
  ['on', import('@ember/object/evented'), 'on'],

  // @ember/object/events
  ['addListener', import('@ember/object/events'), 'addListener'],
  ['removeListener', import('@ember/object/events'), 'removeListener'],
  ['sendEvent', import('@ember/object/events'), 'sendEvent'],

  // @ember/object/internals
  ['cacheFor', import('@ember/object/internals'), 'cacheFor'],
  ['guidFor', import('@ember/object/internals'), 'guidFor'],

  // @ember/object/mixin
  ['Mixin', import('@ember/object/mixin'), 'default'],

  // @ember/object/observable
  ['Observable', import('@ember/object/observable'), 'default'],

  // @ember/object/observers
  ['addObserver', import('@ember/object/observers'), 'addObserver'],
  ['removeObserver', import('@ember/object/observers'), 'removeObserver'],

  // @ember/object/promise-proxy-mixin
  ['PromiseProxyMixin', import('@ember/object/promise-proxy-mixin'), 'default'],

  // @ember/object/proxy
  ['ObjectProxy', import('@ember/object/proxy'), 'default'],

  // @ember/routing/hash-location
  ['HashLocation', import('@ember/routing/hash-location'), 'default'],

  // @ember/routing/history-location
  ['HistoryLocation', import('@ember/routing/history-location'), 'default'],

  // @ember/routing/none-location
  ['NoneLocation', import('@ember/routing/none-location'), 'default'],

  // @ember/routing/route
  ['Route', import('@ember/routing/route'), 'default'],

  // @ember/routing/router
  ['Router', import('@ember/routing/router'), 'default'],

  // @ember/runloop
  ['run', import('@ember/runloop'), 'run'],

  // @ember/service
  ['Service', import('@ember/service'), 'default'],
  ['inject.service', import('@ember/service'), 'service'],

  // @ember/template
  [null, import('@ember/template'), 'htmlSafe'],
  [null, import('@ember/template'), 'isHTMLSafe'],

  // @ember/template-compilation
  ['HTMLBars.compile', import('@ember/template-compilation'), 'compileTemplate'],

  // @ember/template-factory
  ['Handlebars.template', import('@ember/template-factory'), 'createTemplateFactory'],
  ['HTMLBars.template', import('@ember/template-factory'), 'createTemplateFactory'],

  // @ember/test
  ['Test.registerAsyncHelper', import('@ember/test'), 'registerAsyncHelper'],
  ['Test.registerHelper', import('@ember/test'), 'registerHelper'],
  ['Test.registerWaiter', import('@ember/test'), 'registerWaiter'],
  ['Test.unregisterHelper', import('@ember/test'), 'unregisterHelper'],
  ['Test.unregisterWaiter', import('@ember/test'), 'unregisterWaiter'],

  // @ember/test/adapter
  ['Test.Adapter', import('@ember/test/adapter'), 'default'],

  // @ember/utils
  ['compare', import('@ember/utils'), 'compare'],
  ['isBlank', import('@ember/utils'), 'isBlank'],
  ['isEmpty', import('@ember/utils'), 'isEmpty'],
  ['isEqual', import('@ember/utils'), 'isEqual'],
  ['isNone', import('@ember/utils'), 'isNone'],
  ['isPresent', import('@ember/utils'), 'isPresent'],
  ['typeOf', import('@ember/utils'), 'typeOf'],

  // @ember/version
  ['VERSION', import('@ember/version'), 'VERSION'],

  // @glimmer/tracking
  ['_tracked', import('@glimmer/tracking'), 'tracked'],

  // @glimmer/tracking/primitives/cache
  ['_createCache', import('@glimmer/tracking/primitives/cache'), 'createCache'],
  ['_cacheGetValue', import('@glimmer/tracking/primitives/cache'), 'getValue'],
  ['_cacheIsConst', import('@glimmer/tracking/primitives/cache'), 'isConst'],

  // @ember/-internals/environment
  ['ENV', import('@ember/-internals/environment'), { get: 'getENV' }],
  ['lookup', import('@ember/-internals/environment'), { get: 'getLookup', set: 'setLookup' }],

  // @ember/-internals/utils
  ['GUID_KEY', import('@ember/-internals/utils')],
  ['uuid', import('@ember/-internals/utils')],
  ['generateGuid', import('@ember/-internals/utils')],
  ['canInvoke', import('@ember/-internals/utils')],
  ['wrap', import('@ember/-internals/utils')],
  ['_Cache', import('@ember/-internals/utils'), 'Cache'],

  // @ember/-internals/container
  ['Registry', import('@ember/-internals/container'), 'Registry'],
  ['Container', import('@ember/-internals/container'), 'Container'],

  // @ember/-internals/metal
  ['_descriptor', import('@ember/-internals/metal'), 'nativeDescDecorator'],
  ['_setClassicDecorator', import('@ember/-internals/metal'), 'setClassicDecorator'],
  ['_getPath', import('@ember/-internals/metal')],
  ['hasListeners', import('@ember/-internals/metal')],
  ['beginPropertyChanges', import('@ember/-internals/metal')],
  ['endPropertyChanges', import('@ember/-internals/metal')],
  ['changeProperties', import('@ember/-internals/metal')],
  ['libraries', import('@ember/-internals/metal')],
  [
    'BOOTED',
    import('@ember/-internals/metal'),
    { get: 'isNamespaceSearchDisabled', set: 'setNamespaceSearchDisabled' },
  ],

  // @ember/-internals/error-handling
  ['onerror', import('@ember/-internals/error-handling'), { get: 'getOnerror', set: 'setOnerror' }],

  // @ember/-internals/meta
  ['meta', import('@ember/-internals/meta')],

  // @ember/-internals/views
  ['ViewUtils.isSimpleClick', import('@ember/-internals/views'), 'isSimpleClick'],
  ['ViewUtils.getElementView', import('@ember/-internals/views'), 'getElementView'],
  ['ViewUtils.getViewElement', import('@ember/-internals/views'), 'getViewElement'],
  ['ViewUtils.getViewBounds', import('@ember/-internals/views'), 'getViewBounds'],
  ['ViewUtils.getViewClientRects', import('@ember/-internals/views'), 'getViewClientRects'],
  [
    'ViewUtils.getViewBoundingClientRect',
    import('@ember/-internals/views'),
    'getViewBoundingClientRect',
  ],
  ['ViewUtils.getRootViews', import('@ember/-internals/views'), 'getRootViews'],
  ['ViewUtils.getChildViews', import('@ember/-internals/views'), 'getChildViews'],
  [
    'ViewUtils.isSerializationFirstNode',
    import('@ember/-internals/glimmer'),
    'isSerializationFirstNode',
  ],
  ['ComponentLookup', import('@ember/-internals/views')],
  ['EventDispatcher', import('@ember/-internals/views')],

  // @ember/-internals/glimmer
  ['TEMPLATES', import('@ember/-internals/glimmer'), { get: 'getTemplates', set: 'setTemplates' }],
  ['Handlebars.Utils.escapeExpression', import('@ember/-internals/glimmer'), 'escapeExpression'],
  ['_Input', import('@ember/-internals/glimmer'), 'Input'],

  // @ember/-internals/runtime
  ['_RegistryProxyMixin', import('@ember/-internals/runtime'), 'RegistryProxyMixin'],
  ['_ContainerProxyMixin', import('@ember/-internals/runtime'), 'ContainerProxyMixin'],
  ['Comparable', import('@ember/-internals/runtime')],
  ['ActionHandler', import('@ember/-internals/runtime')],
  ['MutableEnumerable', import('@ember/-internals/runtime')],
  ['_ProxyMixin', import('@ember/-internals/runtime')],

  // @ember/-internals/routing
  ['controllerFor', import('@ember/-internals/routing')],
  ['generateControllerFactory', import('@ember/-internals/routing')],
  ['generateController', import('@ember/-internals/routing')],
  ['RouterDSL', import('@ember/-internals/routing')],

  // backburner
  ['_Backburner', import('backburner.js'), 'default'],

  // rsvp
  [null, import('rsvp'), 'default'],
  [null, import('rsvp'), 'Promise'],
  [null, import('rsvp'), 'all'],
  [null, import('rsvp'), 'allSettled'],
  [null, import('rsvp'), 'defer'],
  [null, import('rsvp'), 'denodeify'],
  [null, import('rsvp'), 'filter'],
  [null, import('rsvp'), 'hash'],
  [null, import('rsvp'), 'hashSettled'],
  [null, import('rsvp'), 'map'],
  [null, import('rsvp'), 'off'],
  [null, import('rsvp'), 'on'],
  [null, import('rsvp'), 'race'],
  [null, import('rsvp'), 'reject'],
  [null, import('rsvp'), 'resolve'],
].filter(Boolean);
