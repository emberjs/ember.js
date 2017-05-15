import Ember from '../index';
import { confirmExport } from 'internal-test-helpers';
import { EMBER_METAL_WEAKMAP } from 'ember/features';
import { DEBUG } from 'ember-env-flags';

QUnit.module('ember reexports');

[
  // ember-utils
  ['getOwner', 'ember-utils', 'getOwner'],
  ['setOwner', 'ember-utils', 'setOwner'],
  ['assign', 'ember-utils'],
  ['GUID_KEY', 'ember-utils'],
  ['uuid', 'ember-utils'],
  ['generateGuid', 'ember-utils'],
  ['guidFor', 'ember-utils'],
  ['inspect', 'ember-utils'],
  ['makeArray', 'ember-utils'],
  ['canInvoke', 'ember-utils'],
  ['tryInvoke', 'ember-utils'],
  ['wrap', 'ember-utils'],
  ['applyStr', 'ember-utils'],

  // ember-environment
  // ['ENV', 'ember-environment', 'ENV'], TODO: fix this, its failing because we are hitting the getter

  // container
  ['Registry', 'container', 'Registry'],
  ['Container', 'container', 'Container'],

  // ember-debug
  ['deprecateFunc', 'ember-debug'],
  ['deprecate', 'ember-debug'],
  ['assert', 'ember-debug'],
  ['warn', 'ember-debug'],
  ['debug', 'ember-debug'],
  ['runInDebug', 'ember-debug'],

  // ember-metal
  ['computed', 'ember-metal'],
  ['computed.alias', 'ember-metal', 'alias'],
  ['ComputedProperty', 'ember-metal'],
  ['cacheFor', 'ember-metal'],
  ['merge', 'ember-metal'],
  ['instrument', 'ember-metal'],
  ['Instrumentation.instrument', 'ember-metal', 'instrument'],
  ['Instrumentation.subscribe', 'ember-metal', 'instrumentationSubscribe'],
  ['Instrumentation.unsubscribe', 'ember-metal', 'instrumentationUnsubscribe'],
  ['Instrumentation.reset', 'ember-metal', 'instrumentationReset'],
  ['testing', 'ember-debug', { get: 'isTesting', set: 'setTesting' }],
  ['onerror', 'ember-metal', { get: 'getOnerror', set: 'setOnerror' }],
  // ['create'], TODO: figure out what to do here
  // ['keys'], TODO: figure out what to do here
  ['FEATURES', 'ember/features'],
  ['FEATURES.isEnabled', 'ember-debug', 'isFeatureEnabled'],
  ['Error', 'ember-debug'],
  ['META_DESC', 'ember-metal'],
  ['meta', 'ember-metal'],
  ['get', 'ember-metal'],
  ['set', 'ember-metal'],
  ['_getPath', 'ember-metal'],
  ['getWithDefault', 'ember-metal'],
  ['trySet', 'ember-metal'],
  ['_Cache', 'ember-metal', 'Cache'],
  ['on', 'ember-metal'],
  ['addListener', 'ember-metal'],
  ['removeListener', 'ember-metal'],
  ['_suspendListener', 'ember-metal', 'suspendListener'],
  ['_suspendListeners', 'ember-metal', 'suspendListeners'],
  ['sendEvent', 'ember-metal'],
  ['hasListeners', 'ember-metal'],
  ['watchedEvents', 'ember-metal'],
  ['listenersFor', 'ember-metal'],
  ['accumulateListeners', 'ember-metal'],
  ['isNone', 'ember-metal'],
  ['isEmpty', 'ember-metal'],
  ['isBlank', 'ember-metal'],
  ['isPresent', 'ember-metal'],
  ['_Backburner', 'backburner', 'default'],
  ['run', 'ember-metal'],
  ['_ObserverSet', 'ember-metal', 'ObserverSet'],
  ['propertyWillChange', 'ember-metal'],
  ['propertyDidChange', 'ember-metal'],
  ['overrideChains', 'ember-metal'],
  ['beginPropertyChanges', 'ember-metal'],
  ['beginPropertyChanges', 'ember-metal'],
  ['endPropertyChanges', 'ember-metal'],
  ['changeProperties', 'ember-metal'],
  ['defineProperty', 'ember-metal'],
  ['watchKey', 'ember-metal'],
  ['unwatchKey', 'ember-metal'],
  ['removeChainWatcher', 'ember-metal'],
  ['_ChainNode', 'ember-metal', 'ChainNode'],
  ['finishChains', 'ember-metal'],
  ['watchPath', 'ember-metal'],
  ['unwatchPath', 'ember-metal'],
  ['watch', 'ember-metal'],
  ['isWatching', 'ember-metal'],
  ['unwatch', 'ember-metal'],
  ['destroy', 'ember-metal'],
  ['libraries', 'ember-metal'],
  ['OrderedSet', 'ember-metal'],
  ['Map', 'ember-metal'],
  ['MapWithDefault', 'ember-metal'],
  ['getProperties', 'ember-metal'],
  ['setProperties', 'ember-metal'],
  ['expandProperties', 'ember-metal'],
  ['NAME_KEY', 'ember-utils'],
  ['addObserver', 'ember-metal'],
  ['observersFor', 'ember-metal'],
  ['removeObserver', 'ember-metal'],
  ['_suspendObserver', 'ember-metal'],
  ['_suspendObservers', 'ember-metal'],
  ['required', 'ember-metal'],
  ['aliasMethod', 'ember-metal'],
  ['observer', 'ember-metal'],
  ['immediateObserver', 'ember-metal', '_immediateObserver'],
  ['mixin', 'ember-metal'],
  ['Mixin', 'ember-metal'],
  ['bind', 'ember-metal'],
  ['Binding', 'ember-metal'],
  ['isGlobalPath', 'ember-metal'],

  // ember-views
  ['$', 'ember-views', 'jQuery'],
  ['ViewUtils.isSimpleClick', 'ember-views', 'isSimpleClick'],
  ['ViewUtils.getViewElement', 'ember-views', 'getViewElement'],
  ['ViewUtils.getViewBounds', 'ember-views', 'getViewBounds'],
  ['ViewUtils.getViewClientRects', 'ember-views', 'getViewClientRects'],
  ['ViewUtils.getViewBoundingClientRect', 'ember-views', 'getViewBoundingClientRect'],
  ['ViewUtils.getRootViews', 'ember-views', 'getRootViews'],
  ['ViewUtils.getChildViews', 'ember-views', 'getChildViews'],
  ['TextSupport', 'ember-views'],
  ['ComponentLookup', 'ember-views'],
  ['EventDispatcher', 'ember-views'],

  // ember-glimmer
  ['Component',     'ember-glimmer', 'Component'],
  ['Helper',        'ember-glimmer', 'Helper'],
  ['Helper.helper', 'ember-glimmer', 'helper'],
  ['Checkbox',      'ember-glimmer', 'Checkbox'],
  ['LinkComponent', 'ember-glimmer', 'LinkComponent'],
  ['TextArea',      'ember-glimmer', 'TextArea'],
  ['TextField',     'ember-glimmer', 'TextField'],
  ['TEMPLATES',     'ember-glimmer', { get: 'getTemplates', set: 'setTemplates' }],
  ['Handlebars.template', 'ember-glimmer', 'template'],
  ['Handlebars.SafeString', 'ember-glimmer', { get: '_getSafeString' }],
  ['Handlebars.Utils.escapeExpression', 'ember-glimmer', 'escapeExpression'],
  ['String.htmlSafe', 'ember-glimmer', 'htmlSafe'],

  // ember-runtime
  ['_RegistryProxyMixin', 'ember-runtime', 'RegistryProxyMixin'],
  ['_ContainerProxyMixin', 'ember-runtime', 'ContainerProxyMixin'],
  ['Object', 'ember-runtime'],
  ['String', 'ember-runtime'],
  ['compare', 'ember-runtime'],
  ['copy', 'ember-runtime'],
  ['isEqual', 'ember-runtime'],
  ['inject', 'ember-runtime'],
  ['Array', 'ember-runtime'],
  ['Comparable', 'ember-runtime'],
  ['Namespace', 'ember-runtime'],
  ['Enumerable', 'ember-runtime'],
  ['ArrayProxy', 'ember-runtime'],
  ['ObjectProxy', 'ember-runtime'],
  ['ActionHandler', 'ember-runtime'],
  ['CoreObject', 'ember-runtime'],
  ['NativeArray', 'ember-runtime'],
  ['Copyable', 'ember-runtime'],
  ['Freezable', 'ember-runtime'],
  ['FROZEN_ERROR', 'ember-runtime'],
  ['MutableEnumerable', 'ember-runtime'],
  ['MutableArray', 'ember-runtime'],
  ['TargetActionSupport', 'ember-runtime'],
  ['Evented', 'ember-runtime'],
  ['PromiseProxyMixin', 'ember-runtime'],
  ['Observable', 'ember-runtime'],
  ['typeOf', 'ember-runtime'],
  ['isArray', 'ember-runtime'],
  ['Object', 'ember-runtime'],
  ['onLoad', 'ember-runtime'],
  ['runLoadHooks', 'ember-runtime'],
  ['Controller', 'ember-runtime'],
  ['ControllerMixin', 'ember-runtime'],
  ['Service', 'ember-runtime'],
  ['_ProxyMixin', 'ember-runtime'],
  ['RSVP', 'ember-runtime'],
  ['STRINGS', 'ember-runtime', { get: 'getStrings', set: 'setStrings' }],
  ['BOOTED', 'ember-runtime', { get: 'isNamespaceSearchDisabled', set: 'setNamespaceSearchDisabled' }],

  // ember-routing
  ['Location', 'ember-routing'],
  ['AutoLocation', 'ember-routing'],
  ['HashLocation', 'ember-routing'],
  ['HistoryLocation', 'ember-routing'],
  ['NoneLocation', 'ember-routing'],
  ['controllerFor', 'ember-routing'],
  ['generateControllerFactory', 'ember-routing'],
  ['generateController', 'ember-routing'],
  ['RouterDSL', 'ember-routing'],
  ['Router', 'ember-routing'],
  ['Route', 'ember-routing'],

  // ember-application
  ['Application', 'ember-application'],
  ['ApplicationInstance', 'ember-application'],
  ['Engine', 'ember-application'],
  ['EngineInstance', 'ember-application'],
  ['Resolver', 'ember-application'],
  ['DefaultResolver', 'ember-application', 'Resolver'],

  // ember-extension-support
  ['DataAdapter', 'ember-extension-support'],
  ['ContainerDebugAdapter', 'ember-extension-support']
].forEach(reexport => {
  let [path, moduleId, exportName] = reexport;

  // default path === exportName if none present
  if (!exportName) {
    exportName = path;
  }

  QUnit.test(`Ember.${path} exports correctly`, assert => {
    confirmExport(Ember, assert, path, moduleId, exportName);
  });
});

QUnit.test('Ember.String.isHTMLSafe exports correctly', function(assert) {
  confirmExport(Ember, assert, 'String.isHTMLSafe', 'ember-glimmer', 'isHTMLSafe');
});

if (EMBER_METAL_WEAKMAP) {
  QUnit.test('Ember.WeakMap exports correctly', function(assert) {
    confirmExport(Ember, assert, 'WeakMap', 'ember-metal', 'WeakMap');
  });
}

if (DEBUG) {
  QUnit.test('Ember.MODEL_FACTORY_INJECTIONS', function(assert) {
    let descriptor = Object.getOwnPropertyDescriptor(Ember, 'MODEL_FACTORY_INJECTIONS');
    assert.equal(descriptor.enumerable, false, 'descriptor is not enumerable');
    assert.equal(descriptor.configurable, false, 'descriptor is not configurable');

    assert.equal(Ember.MODEL_FACTORY_INJECTIONS, false)

    expectDeprecation(function() {
      Ember.MODEL_FACTORY_INJECTIONS = true;
    }, 'Ember.MODEL_FACTORY_INJECTIONS is no longer required')
    assert.equal(Ember.MODEL_FACTORY_INJECTIONS, false, 'writing to the property has no affect')
  });
}
