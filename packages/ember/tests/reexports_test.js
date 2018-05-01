import Ember from '../index';
import { FEATURES } from '@ember/canary-features';
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

    ['@test Ember.EXTEND_PROTOTYPES is present (but deprecated)'](assert) {
      expectDeprecation(() => {
        assert.strictEqual(
          Ember.ENV.EXTEND_PROTOTYPES,
          Ember.EXTEND_PROTOTYPES,
          'Ember.EXTEND_PROTOTYPES exists'
        );
      }, /EXTEND_PROTOTYPES is deprecated/);
    }

    '@test Ember.FEATURES is exported'(assert) {
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
  // ember-environment
  ['ENV', 'ember-environment', { get: 'getENV' }],
  ['lookup', 'ember-environment', { get: 'getLookup', set: 'setLookup' }],

  // ember-utils
  ['getOwner', '@ember/application', 'getOwner'],
  ['setOwner', '@ember/application', 'setOwner'],
  ['assign', '@ember/polyfills'],
  ['GUID_KEY', 'ember-utils'],
  ['uuid', 'ember-utils'],
  ['generateGuid', 'ember-utils'],
  ['guidFor', 'ember-utils'],
  ['inspect', 'ember-utils'],
  ['makeArray', 'ember-utils'],
  ['canInvoke', 'ember-utils'],
  ['tryInvoke', 'ember-utils'],
  ['wrap', 'ember-utils'],
  ['NAME_KEY', 'ember-utils'],

  // container
  ['Registry', 'container', 'Registry'],
  ['Container', 'container', 'Container'],

  // @ember/debug
  ['deprecateFunc', '@ember/debug'],
  ['deprecate', '@ember/debug'],
  ['assert', '@ember/debug'],
  ['warn', '@ember/debug'],
  ['debug', '@ember/debug'],
  ['runInDebug', '@ember/debug'],
  ['Debug.registerDeprecationHandler', '@ember/debug', 'registerDeprecationHandler'],
  ['Debug.registerWarnHandler', '@ember/debug', 'registerWarnHandler'],
  ['Error', '@ember/error', 'default'],

  // ember-metal
  ['computed', 'ember-metal', '_globalsComputed'],
  ['computed.alias', 'ember-metal', 'alias'],
  ['ComputedProperty', 'ember-metal'],
  ['cacheFor', 'ember-metal', 'getCachedValueFor'],
  ['merge', '@ember/polyfills'],
  ['instrument', '@ember/instrumentation'],
  ['subscribe', '@ember/instrumentation', 'subscribe'],
  ['Instrumentation.instrument', '@ember/instrumentation', 'instrument'],
  ['Instrumentation.subscribe', '@ember/instrumentation', 'subscribe'],
  ['Instrumentation.unsubscribe', '@ember/instrumentation', 'unsubscribe'],
  ['Instrumentation.reset', '@ember/instrumentation', 'reset'],
  ['testing', '@ember/debug', { get: 'isTesting', set: 'setTesting' }],
  ['onerror', 'ember-error-handling', { get: 'getOnerror', set: 'setOnerror' }],
  ['FEATURES.isEnabled', '@ember/canary-features', 'isEnabled'],
  ['meta', 'ember-metal'],
  ['get', 'ember-metal'],
  ['set', 'ember-metal'],
  ['_getPath', 'ember-metal'],
  ['getWithDefault', 'ember-metal'],
  ['trySet', 'ember-metal'],
  ['_Cache', 'ember-utils', 'Cache'],
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
  ['run', '@ember/runloop', '_globalsRun'],
  ['run.backburner', '@ember/runloop', 'backburner'],
  ['run.begin', '@ember/runloop', 'begin'],
  ['run.bind', '@ember/runloop', 'bind'],
  ['run.cancel', '@ember/runloop', 'cancel'],
  ['run.debounce', '@ember/runloop', 'debounce'],
  ['run.end', '@ember/runloop', 'end'],
  ['run.hasScheduledTimers', '@ember/runloop', 'hasScheduledTimers'],
  ['run.join', '@ember/runloop', 'join'],
  ['run.later', '@ember/runloop', 'later'],
  ['run.next', '@ember/runloop', 'next'],
  ['run.once', '@ember/runloop', 'once'],
  ['run.schedule', '@ember/runloop', 'schedule'],
  ['run.scheduleOnce', '@ember/runloop', 'scheduleOnce'],
  ['run.throttle', '@ember/runloop', 'throttle'],
  ['run.currentRunLoop', '@ember/runloop', { get: 'getCurrentRunLoop' }],
  ['run.cancelTimers', '@ember/runloop', 'cancelTimers'],
  ['propertyWillChange', 'ember-metal'],
  ['propertyDidChange', 'ember-metal'],
  ['notifyPropertyChange', 'ember-metal'],
  ['overrideChains', 'ember-metal'],
  ['beginPropertyChanges', 'ember-metal'],
  ['endPropertyChanges', 'ember-metal'],
  ['changeProperties', 'ember-metal'],
  ['platform.defineProperty', null, { value: true }],
  ['platform.hasPropertyAccessors', null, { value: true }],
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
  ['OrderedSet', '@ember/map/lib/ordered-set', 'default'],
  ['Map', '@ember/map', 'default'],
  ['MapWithDefault', '@ember/map/with-default', 'default'],
  ['getProperties', 'ember-metal'],
  ['setProperties', 'ember-metal'],
  ['expandProperties', 'ember-metal'],
  ['addObserver', 'ember-metal'],
  ['removeObserver', 'ember-metal'],
  ['aliasMethod', 'ember-metal'],
  ['observer', 'ember-metal'],
  ['mixin', 'ember-metal'],
  ['Mixin', 'ember-metal'],

  // ember-console
  ['Logger', 'ember-console', 'default'],

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
  ['HTMLBars.template', 'ember-glimmer', 'template'],
  ['Handlebars.Utils.escapeExpression', 'ember-glimmer', 'escapeExpression'],
  ['String.htmlSafe', 'ember-glimmer', 'htmlSafe'],
  ['_setComponentManager', 'ember-glimmer', 'componentManager'],

  // ember-runtime
  ['A', 'ember-runtime'],
  ['_RegistryProxyMixin', 'ember-runtime', 'RegistryProxyMixin'],
  ['_ContainerProxyMixin', 'ember-runtime', 'ContainerProxyMixin'],
  ['Object', 'ember-runtime'],
  ['String.loc', '@ember/string', 'loc'],
  ['String.w', '@ember/string', 'w'],
  ['String.dasherize', '@ember/string', 'dasherize'],
  ['String.decamelize', '@ember/string', 'decamelize'],
  ['String.camelize', '@ember/string', 'camelize'],
  ['String.classify', '@ember/string', 'classify'],
  ['String.underscore', '@ember/string', 'underscore'],
  ['String.capitalize', '@ember/string', 'capitalize'],
  ['compare', 'ember-runtime'],
  ['copy', 'ember-runtime'],
  ['isEqual', 'ember-runtime'],
  ['inject.controller', '@ember/controller', 'inject'],
  ['inject.service', '@ember/service', 'inject'],
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
  ['onLoad', '@ember/application'],
  ['runLoadHooks', '@ember/application'],
  ['Controller', '@ember/controller', 'default'],
  ['ControllerMixin', '@ember/controller/lib/controller_mixin', 'default'],
  ['Service', '@ember/service', 'default'],
  ['_ProxyMixin', 'ember-runtime'],
  ['RSVP', 'ember-runtime'],
  ['STRINGS', '@ember/string', { get: '_getStrings', set: '_setStrings' }],
  [
    'BOOTED',
    'ember-metal',
    { get: 'isNamespaceSearchDisabled', set: 'setNamespaceSearchDisabled' },
  ],
  ['computed.empty', '@ember/object/computed', 'empty'],
  ['computed.notEmpty', '@ember/object/computed', 'notEmpty'],
  ['computed.none', '@ember/object/computed', 'none'],
  ['computed.not', '@ember/object/computed', 'not'],
  ['computed.bool', '@ember/object/computed', 'bool'],
  ['computed.match', '@ember/object/computed', 'match'],
  ['computed.equal', '@ember/object/computed', 'equal'],
  ['computed.gt', '@ember/object/computed', 'gt'],
  ['computed.gte', '@ember/object/computed', 'gte'],
  ['computed.lt', '@ember/object/computed', 'lt'],
  ['computed.lte', '@ember/object/computed', 'lte'],
  ['computed.oneWay', '@ember/object/computed', 'oneWay'],
  ['computed.reads', '@ember/object/computed', 'oneWay'],
  ['computed.readOnly', '@ember/object/computed', 'readOnly'],
  ['computed.deprecatingAlias', '@ember/object/computed', 'deprecatingAlias'],
  ['computed.and', '@ember/object/computed', 'and'],
  ['computed.or', '@ember/object/computed', 'or'],
  ['computed.sum', '@ember/object/computed', 'sum'],
  ['computed.min', '@ember/object/computed', 'min'],
  ['computed.max', '@ember/object/computed', 'max'],
  ['computed.map', '@ember/object/computed', 'map'],
  ['computed.sort', '@ember/object/computed', 'sort'],
  ['computed.setDiff', '@ember/object/computed', 'setDiff'],
  ['computed.mapBy', '@ember/object/computed', 'mapBy'],
  ['computed.filter', '@ember/object/computed', 'filter'],
  ['computed.filterBy', '@ember/object/computed', 'filterBy'],
  ['computed.uniq', '@ember/object/computed', 'uniq'],
  ['computed.uniqBy', '@ember/object/computed', 'uniqBy'],
  ['computed.union', '@ember/object/computed', 'union'],
  ['computed.intersect', '@ember/object/computed', 'intersect'],
  ['computed.collect', '@ember/object/computed', 'collect'],

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
  ['Application', '@ember/application', 'default'],
  ['ApplicationInstance', '@ember/application/instance', 'default'],
  ['Engine', '@ember/engine', 'default'],
  ['EngineInstance', '@ember/engine/instance', 'default'],
  ['Resolver', '@ember/application/globals-resolver', 'default'],
  ['DefaultResolver', '@ember/application/globals-resolver', 'default'],

  // ember-extension-support
  ['DataAdapter', 'ember-extension-support'],
  ['ContainerDebugAdapter', 'ember-extension-support'],
];
