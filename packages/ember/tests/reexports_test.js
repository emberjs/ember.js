import Ember from '../index';
import { confirmExport } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember reexports',
  class extends AbstractTestCase {
    [`@test Ember exports correctly`](assert) {
      allExports.forEach(reexport => {
        let [path, moduleId, exportName] = reexport;

        // default path === exportName if none present
        if (!exportName) {
          exportName = path;
        }

        confirmExport(Ember, assert, path, moduleId, exportName, `Ember.${path} exports correctly`);
      });
    }

    ['@test Ember.String.isHTMLSafe exports correctly'](assert) {
      confirmExport(Ember, assert, 'String.isHTMLSafe', 'ember-glimmer', 'isHTMLSafe');
    }
  }
);

let allExports = [
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
  ['computed', 'ember-metal', '_globalsComputed'],
  ['computed.alias', 'ember-metal', 'alias'],
  ['ComputedProperty', 'ember-metal'],
  ['cacheFor', 'ember-metal', 'getCachedValueFor'],
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
  ['sendEvent', 'ember-metal'],
  ['hasListeners', 'ember-metal'],
  ['isNone', 'ember-metal'],
  ['isEmpty', 'ember-metal'],
  ['isBlank', 'ember-metal'],
  ['isPresent', 'ember-metal'],
  ['_Backburner', 'backburner', 'default'],
  ['run', 'ember-metal', '_globalsRun'],
  ['run.backburner', 'ember-metal', 'backburner'],
  ['run.begin', 'ember-metal', 'begin'],
  ['run.bind', 'ember-metal', 'bind'],
  ['run.cancel', 'ember-metal', 'cancel'],
  ['run.debounce', 'ember-metal', 'debounce'],
  ['run.end', 'ember-metal', 'end'],
  ['run.hasScheduledTimers', 'ember-metal', 'hasScheduledTimers'],
  ['run.join', 'ember-metal', 'join'],
  ['run.later', 'ember-metal', 'later'],
  ['run.next', 'ember-metal', 'next'],
  ['run.once', 'ember-metal', 'once'],
  ['run.schedule', 'ember-metal', 'schedule'],
  ['run.scheduleOnce', 'ember-metal', 'scheduleOnce'],
  ['run.throttle', 'ember-metal', 'throttle'],
  ['run.currentRunLoop', 'ember-metal', { get: 'getCurrentRunLoop' }],
  ['propertyWillChange', 'ember-metal'],
  ['propertyDidChange', 'ember-metal'],
  ['notifyPropertyChange', 'ember-metal'],
  ['overrideChains', 'ember-metal'],
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
  ['destroy', 'ember-metal', 'deleteMeta'],
  ['libraries', 'ember-metal'],
  ['OrderedSet', 'ember-metal'],
  ['Map', 'ember-metal'],
  ['MapWithDefault', 'ember-metal'],
  ['getProperties', 'ember-metal'],
  ['setProperties', 'ember-metal'],
  ['expandProperties', 'ember-metal'],
  ['addObserver', 'ember-metal'],
  ['removeObserver', 'ember-metal'],
  ['aliasMethod', 'ember-metal'],
  ['observer', 'ember-metal'],
  ['mixin', 'ember-metal'],
  ['Mixin', 'ember-metal'],

  // ember-views
  ['$', 'ember-views', 'jQuery'],
  ['ViewUtils.isSimpleClick', 'ember-views', 'isSimpleClick'],
  ['ViewUtils.getViewElement', 'ember-views', 'getViewElement'],
  ['ViewUtils.getViewBounds', 'ember-views', 'getViewBounds'],
  ['ViewUtils.getViewClientRects', 'ember-views', 'getViewClientRects'],
  ['ViewUtils.getViewBoundingClientRect', 'ember-views', 'getViewBoundingClientRect'],
  ['ViewUtils.getRootViews', 'ember-views', 'getRootViews'],
  ['ViewUtils.getChildViews', 'ember-views', 'getChildViews'],
  ['ViewUtils.isSerializationFirstNode', 'ember-glimmer', 'isSerializationFirstNode'],
  ['TextSupport', 'ember-views'],
  ['ComponentLookup', 'ember-views'],
  ['EventDispatcher', 'ember-views'],

  // ember-glimmer
  ['Component', 'ember-glimmer', 'Component'],
  ['Helper', 'ember-glimmer', 'Helper'],
  ['Helper.helper', 'ember-glimmer', 'helper'],
  ['Checkbox', 'ember-glimmer', 'Checkbox'],
  ['LinkComponent', 'ember-glimmer', 'LinkComponent'],
  ['TextArea', 'ember-glimmer', 'TextArea'],
  ['TextField', 'ember-glimmer', 'TextField'],
  ['TEMPLATES', 'ember-glimmer', { get: 'getTemplates', set: 'setTemplates' }],
  ['Handlebars.template', 'ember-glimmer', 'template'],
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
  [
    'BOOTED',
    'ember-metal',
    { get: 'isNamespaceSearchDisabled', set: 'setNamespaceSearchDisabled' },
  ],

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
  ['ContainerDebugAdapter', 'ember-extension-support'],
];
