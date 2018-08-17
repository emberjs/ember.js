import Ember from '../index';
import { FEATURES } from '@ember/canary-features';
import { confirmExport } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { jQueryDisabled } from '@ember/-internals/views';

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
  // @ember/-internals/environment
  ['ENV', '@ember/-internals/environment', { get: 'getENV' }],
  ['lookup', '@ember/-internals/environment', { get: 'getLookup', set: 'setLookup' }],

  ['getOwner', '@ember/application', 'getOwner'],
  ['setOwner', '@ember/application', 'setOwner'],
  ['assign', '@ember/polyfills'],

  // @ember/-internals/utils
  ['GUID_KEY', '@ember/-internals/utils'],
  ['uuid', '@ember/-internals/utils'],
  ['generateGuid', '@ember/-internals/utils'],
  ['guidFor', '@ember/-internals/utils'],
  ['inspect', '@ember/-internals/utils'],
  ['makeArray', '@ember/-internals/utils'],
  ['canInvoke', '@ember/-internals/utils'],
  ['tryInvoke', '@ember/-internals/utils'],
  ['wrap', '@ember/-internals/utils'],
  ['NAME_KEY', '@ember/-internals/utils'],

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

  // @ember/-internals/metal
  ['computed', '@ember/-internals/metal', '_globalsComputed'],
  ['computed.alias', '@ember/-internals/metal', 'alias'],
  ['ComputedProperty', '@ember/-internals/metal'],
  ['cacheFor', '@ember/-internals/metal', 'getCachedValueFor'],
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
  ['meta', 'ember-meta'],
  ['get', '@ember/-internals/metal'],
  ['set', '@ember/-internals/metal'],
  ['_getPath', '@ember/-internals/metal'],
  ['getWithDefault', '@ember/-internals/metal'],
  ['trySet', '@ember/-internals/metal'],
  ['_Cache', '@ember/-internals/utils', 'Cache'],
  ['on', '@ember/-internals/metal'],
  ['addListener', '@ember/-internals/metal'],
  ['removeListener', '@ember/-internals/metal'],
  ['sendEvent', '@ember/-internals/metal'],
  ['hasListeners', '@ember/-internals/metal'],
  ['isNone', '@ember/-internals/metal'],
  ['isEmpty', '@ember/-internals/metal'],
  ['isBlank', '@ember/-internals/metal'],
  ['isPresent', '@ember/-internals/metal'],
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
  ['propertyWillChange', '@ember/-internals/metal'],
  ['propertyDidChange', '@ember/-internals/metal'],
  ['notifyPropertyChange', '@ember/-internals/metal'],
  ['overrideChains', '@ember/-internals/metal'],
  ['beginPropertyChanges', '@ember/-internals/metal'],
  ['endPropertyChanges', '@ember/-internals/metal'],
  ['changeProperties', '@ember/-internals/metal'],
  ['platform.defineProperty', null, { value: true }],
  ['platform.hasPropertyAccessors', null, { value: true }],
  ['defineProperty', '@ember/-internals/metal'],
  ['watchKey', '@ember/-internals/metal'],
  ['unwatchKey', '@ember/-internals/metal'],
  ['removeChainWatcher', '@ember/-internals/metal'],
  ['_ChainNode', '@ember/-internals/metal', 'ChainNode'],
  ['finishChains', '@ember/-internals/metal'],
  ['watchPath', '@ember/-internals/metal'],
  ['unwatchPath', '@ember/-internals/metal'],
  ['watch', '@ember/-internals/metal'],
  ['isWatching', '@ember/-internals/metal'],
  ['unwatch', '@ember/-internals/metal'],
  ['destroy', 'ember-meta', 'deleteMeta'],
  ['libraries', '@ember/-internals/metal'],
  ['OrderedSet', '@ember/map/lib/ordered-set', 'default'],
  ['Map', '@ember/map', 'default'],
  ['MapWithDefault', '@ember/map/with-default', 'default'],
  ['getProperties', '@ember/-internals/metal'],
  ['setProperties', '@ember/-internals/metal'],
  ['expandProperties', '@ember/-internals/metal'],
  ['addObserver', '@ember/-internals/metal'],
  ['removeObserver', '@ember/-internals/metal'],
  ['aliasMethod', '@ember/-internals/metal'],
  ['observer', '@ember/-internals/metal'],
  ['mixin', '@ember/-internals/metal'],
  ['Mixin', '@ember/-internals/metal'],

  // ember-console
  ['Logger', 'ember-console', 'default'],

  // @ember/-internals/views
  !jQueryDisabled && ['$', '@ember/-internals/views', 'jQuery'],
  ['ViewUtils.isSimpleClick', '@ember/-internals/views', 'isSimpleClick'],
  ['ViewUtils.getViewElement', '@ember/-internals/views', 'getViewElement'],
  ['ViewUtils.getViewBounds', '@ember/-internals/views', 'getViewBounds'],
  ['ViewUtils.getViewClientRects', '@ember/-internals/views', 'getViewClientRects'],
  ['ViewUtils.getViewBoundingClientRect', '@ember/-internals/views', 'getViewBoundingClientRect'],
  ['ViewUtils.getRootViews', '@ember/-internals/views', 'getRootViews'],
  ['ViewUtils.getChildViews', '@ember/-internals/views', 'getChildViews'],
  ['ViewUtils.isSerializationFirstNode', 'ember-glimmer', 'isSerializationFirstNode'],
  ['TextSupport', '@ember/-internals/views'],
  ['ComponentLookup', '@ember/-internals/views'],
  ['EventDispatcher', '@ember/-internals/views'],

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
  ['_setComponentManager', 'ember-glimmer', 'setComponentManager'],
  ['_componentManagerCapabilities', 'ember-glimmer', 'capabilities'],

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
    '@ember/-internals/metal',
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
].filter(Boolean);
