import Ember from 'ember';
import isEnabled from 'ember-metal/features';
import require from 'require';

QUnit.module('ember reexports');

[
  // ember-environment
  // ['ENV', 'ember-environment', 'ENV'], TODO: fix this, its failing because we are hitting the getter

  // container
  ['getOwner', 'container', 'getOwner'],
  ['setOwner', 'container', 'setOwner'],
  ['Registry', 'container', 'Registry'],
  ['Container', 'container', 'Container'],

  // ember-metal
  ['computed', 'ember-metal'],
  ['computed.alias', 'ember-metal', 'alias'],
  ['ComputedProperty', 'ember-metal'],
  ['cacheFor', 'ember-metal'],
  ['deprecate', 'ember-metal'],
  ['deprecateFunc', 'ember-metal'],
  ['assert', 'ember-metal'],
  ['warn', 'ember-metal'],
  ['debug', 'ember-metal'],
  ['runInDebug', 'ember-metal'],
  // ['assign', 'ember-metal'], TODO: fix this test, we use `Object.assign` if present
  ['merge', 'ember-metal'],
  ['instrument', 'ember-metal'],
  ['Instrumentation.instrument', 'ember-metal', 'instrument'],
  ['Instrumentation.subscribe', 'ember-metal', 'instrumentationSubscribe'],
  ['Instrumentation.unsubscribe', 'ember-metal', 'instrumentationUnsubscribe'],
  ['Instrumentation.reset', 'ember-metal', 'instrumentationReset'],
  ['generateGuid', 'ember-metal'],
  ['GUID_KEY', 'ember-metal'],
  ['guidFor', 'ember-metal'],
  ['inspect', 'ember-metal'],
  ['tryCatchFinally', 'ember-metal', 'deprecatedTryCatchFinally'],
  ['makeArray', 'ember-metal'],
  ['canInvoke', 'ember-metal'],
  ['tryInvoke', 'ember-metal'],
  ['wrap', 'ember-metal'],
  ['apply', 'ember-metal'],
  ['applyStr', 'ember-metal'],
  ['uuid', 'ember-metal'],
  ['testing', 'ember-metal', { get: 'isTesting', set: 'setTesting' }],
  ['onerror', 'ember-metal', { get: 'getOnerror', set: 'setOnerror' }],
  // ['create'], TODO: figure out what to do here
  // ['keys'], TODO: figure out what to do here
  ['FEATURES', 'ember-metal'],
  ['FEATURES.isEnabled', 'ember-metal', 'isFeatureEnabled'],
  ['Error', 'ember-metal'],
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
  ['rewatch', 'ember-metal'],
  ['destroy', 'ember-metal'],
  ['libraries', 'ember-metal'],
  ['OrderedSet', 'ember-metal'],
  ['Map', 'ember-metal'],
  ['MapWithDefault', 'ember-metal'],
  ['getProperties', 'ember-metal'],
  ['setProperties', 'ember-metal'],
  ['expandProperties', 'ember-metal'],
  ['NAME_KEY', 'ember-metal'],
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

  // ember-glimmer
  ['_Renderer',     'ember-glimmer', '_Renderer'],
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
  ['HTMLBars.makeBoundHelper', 'ember-glimmer', 'makeBoundHelper'],

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
  ['BOOTED', 'ember-runtime', { get: 'isNamespaceSearchDisabled', set: 'setNamespaceSearchDisabled' }]
].forEach(reexport => {
  let [path, moduleId, exportName] = reexport;

  // default path === exportName if none present
  if (!exportName) {
    exportName = path;
  }

  QUnit.test(`Ember.${path} exports correctly`, assert => {
    confirmExport(assert, path, moduleId, exportName);
  });
});

if (isEnabled('ember-string-ishtmlsafe')) {
  QUnit.test('Ember.String.isHTMLSafe exports correctly', function(assert) {
    confirmExport(assert, 'String.isHTMLSafe', 'ember-glimmer', 'isHTMLSafe');
  });
}

if (isEnabled('ember-metal-weakmap')) {
  QUnit.test('Ember.WeakMap exports correctly', function(assert) {
    confirmExport(assert, 'WeakMap', 'ember-metal', 'WeakMap');
  });
}
function confirmExport(assert, path, moduleId, exportName) {
  let desc = getDescriptor(Ember, path);
  assert.ok(desc, 'the property exists on the global');

  let mod = require(moduleId);
  if (typeof exportName === 'string') {
    assert.equal(desc.value, mod[exportName], `Ember.${path} is exported correctly`);
  } else {
    assert.equal(desc.get, mod[exportName.get], `Ember.${path} getter is exported correctly`);
    assert.equal(desc.set, mod[exportName.set], `Ember.${path} setter is exported correctly`);
  }
}

function getDescriptor(obj, path) {
  let parts = path.split('.');
  let value = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    let part = parts[i];
    value = value[part];
    if (!value) {
      return undefined;
    }
  }
  let last = parts[parts.length - 1];
  return Object.getOwnPropertyDescriptor(value, last);
}
