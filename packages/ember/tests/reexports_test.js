import Ember from '../index';
import require from 'require';
import { FEATURES, EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { confirmExport } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { jQueryDisabled, jQuery } from '@ember/-internals/views';
import Resolver from '@ember/application/globals-resolver';
import { DEBUG } from '@glimmer/env';
import { ENV } from '@ember/-internals/environment';

moduleFor(
  'ember reexports',
  class extends AbstractTestCase {
    [`@test Ember exports correctly`](assert) {
      allExports.forEach((reexport) => {
        let [path, moduleId, exportName, isDeprecated] = reexport;

        // default path === exportName if none present
        if (!exportName) {
          exportName = path;
        }

        confirmExport(
          Ember,
          assert,
          path,
          moduleId,
          exportName,
          isDeprecated,
          `Ember.${path} exports correctly`
        );
      });
    }

    ['@feature(EMBER_MODERNIZED_BUILT_IN_COMPONENTS) deprecated built-in components'](assert) {
      [
        ['Checkbox', '@ember/component/checkbox', '@ember/-internals/glimmer'],
        ['TextField', '@ember/component/text-field', '@ember/-internals/glimmer'],
        ['TextArea', '@ember/component/text-area', '@ember/-internals/glimmer'],
        ['LinkComponent', '@ember/routing/link-component', '@ember/-internals/glimmer'],
        ['TextSupport', null, '@ember/-internals/views'],
        ['TargetActionSupport', null, '@ember/-internals/runtime'],
      ].forEach(([name, publicPath, privatePath]) => {
        // loosely based on confirmExport
        try {
          let module = require(privatePath);
          let value = module[name];

          assert.ok(
            Object.prototype.hasOwnProperty.call(Ember, name),
            `the ${name} property exists on the Ember global`
          );

          assert.strictEqual(
            Ember[`_Legacy${name}`],
            value,
            `Ember._Legacy${name} has the correct value and does not trigger a deprecation`
          );

          expectDeprecation(
            () =>
              assert.strictEqual(
                Ember[name],
                value,
                `Ember.${name} has the correct value triggers a deprecation`
              ),
            publicPath === null
              ? `Using Ember.${name} is deprecated.`
              : `Using Ember.${name} or importing from '${publicPath}' is deprecated. Install the \`@ember/legacy-built-in-components\` addon and use \`import { ${name} } from '@ember/legacy-built-in-components';\` instead.`
          );
        } catch (error) {
          assert.pushResult({
            result: false,
            message: `An error occurred while testing ${name} is exported from ${privatePath}.`,
            source: error,
          });
        }
      });
    }

    ['@skip Ember.String.htmlSafe exports correctly (but deprecated)'](assert) {
      let glimmer = require('@ember/-internals/glimmer');
      expectDeprecation(() => {
        assert.equal(
          Ember.String.htmlSafe,
          glimmer.htmlSafe,
          'Ember.String.htmlSafe is exported correctly'
        );
      }, /Importing htmlSafe from '@ember\/string' is deprecated/);
      assert.notEqual(glimmer.htmlSafe, undefined, 'Ember.String.htmlSafe is not `undefined`');
    }

    ['@skip Ember.String.isHTMLSafe exports correctly (but deprecated)'](assert) {
      let glimmer = require('@ember/-internals/glimmer');
      expectDeprecation(() => {
        assert.equal(
          Ember.String.isHTMLSafe,
          glimmer.isHTMLSafe,
          'Ember.String.isHTMLSafe is exported correctly'
        );
      }, /Importing isHTMLSafe from '@ember\/string' is deprecated/);
      assert.notEqual(glimmer.isHTMLSafe, undefined, 'Ember.String.isHTMLSafe is not `undefined`');
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

    ['@test Ember.Resolver is present (but deprecated)'](assert) {
      expectDeprecation(() => {
        assert.strictEqual(Ember.Resolver, Resolver, 'Ember.Resolver exists');
      }, /Using the globals resolver is deprecated/);
    }

    ['@test Ember.DefaultResolver is present (but deprecated)'](assert) {
      expectDeprecation(() => {
        assert.strictEqual(Ember.DefaultResolver, Resolver, 'Ember.DefaultResolver exists');
      }, /Using the globals resolver is deprecated/);
    }
  }
);

if (!jQueryDisabled) {
  moduleFor(
    'ember reexports: jQuery enabled',
    class extends AbstractTestCase {
      [`@test Ember.$ is exported`](assert) {
        expectDeprecation(() => {
          let body = Ember.$('body').get(0);
          assert.equal(body, document.body, 'Ember.$ exports working jQuery instance');
        }, "Using Ember.$() has been deprecated, use `import jQuery from 'jquery';` instead");
      }

      '@test Ember.$ _**is**_ window.jQuery'(assert) {
        expectDeprecation(() => {
          assert.strictEqual(Ember.$, jQuery);
        }, "Using Ember.$() has been deprecated, use `import jQuery from 'jquery';` instead");
      }
    }
  );
}

let allExports = [
  // @ember/application
  ['Application', '@ember/application', 'default'],
  ['getOwner', '@ember/application', 'getOwner'],
  ['onLoad', '@ember/application', 'onLoad'],
  ['runLoadHooks', '@ember/application', 'runLoadHooks'],
  ['setOwner', '@ember/application', 'setOwner'],

  // @ember/application/deprecations
  [null, '@ember/application/deprecations', 'deprecate'],
  [null, '@ember/application/deprecations', 'deprecateFunc'],

  // @ember/application/instance
  ['ApplicationInstance', '@ember/application/instance', 'default'],

  // @ember/application/namespace
  ['Namespace', '@ember/application/namespace', 'default'],

  // @ember/array
  ['Array', '@ember/array', 'default'],
  ['A', '@ember/array', 'A'],
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
  ['_Input', '@ember/component', 'Input'],
  ['_componentManagerCapabilities', '@ember/component', 'capabilities'],
  ['_getComponentTemplate', '@ember/component', 'getComponentTemplate'],
  ['_setComponentManager', '@ember/component', 'setComponentManager'],
  ['_setComponentTemplate', '@ember/component', 'setComponentTemplate'],

  // @ember/component/checkbox
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['Checkbox', '@ember/component/checkbox'],

  // @ember/component/helper
  ['Helper', '@ember/component/helper', 'default'],
  ['Helper.helper', '@ember/component/helper', 'helper'],

  // @ember/component/template-only
  ['_templateOnlyComponent', '@ember/component/template-only', 'default'],

  // @ember/component/text-area
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['TextArea', '@ember/-component/text-area'],

  // @ember/component/text-field
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['TextField', '@ember/component/text-field'],

  // @ember/controller
  ['Controller', '@ember/controller', 'default'],
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

  // @ember/error
  ['Error', '@ember/error', 'default'],

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
  ['aliasMethod', '@ember/object', 'aliasMethod'],
  ['computed', '@ember/object', 'computed'],
  ['defineProperty', '@ember/object', 'defineProperty'],
  ['get', '@ember/object', 'get'],
  ['getProperties', '@ember/object', 'getProperties'],
  ['getWithDefault', '@ember/object', 'getWithDefault'],
  ['notifyPropertyChange', '@ember/object', 'notifyPropertyChange'],
  ['observer', '@ember/object', 'observer'],
  ['set', '@ember/object', 'set'],
  ['setProperties', '@ember/object', 'setProperties'],
  ['trySet', '@ember/object', 'trySet'],

  // @ember/object/compat
  ['_dependentKeyCompat', '@ember/object/compat', 'dependentKeyCompat'],

  // @ember/object/computed
  ['ComputedProperty', '@ember/object/computed', 'default'],
  ['computed.alias', '@ember/object/computed', 'alias', true],
  ['computed.and', '@ember/object/computed', 'and', true],
  ['computed.bool', '@ember/object/computed', 'bool', true],
  ['computed.collect', '@ember/object/computed', 'collect', true],
  ['computed.deprecatingAlias', '@ember/object/computed', 'deprecatingAlias', true],
  ['computed.empty', '@ember/object/computed', 'empty', true],
  ['computed.equal', '@ember/object/computed', 'equal', true],
  ['expandProperties', '@ember/object/computed', 'expandProperties', true],
  ['computed.filter', '@ember/object/computed', 'filter', true],
  ['computed.filterBy', '@ember/object/computed', 'filterBy', true],
  ['computed.gt', '@ember/object/computed', 'gt', true],
  ['computed.gte', '@ember/object/computed', 'gte', true],
  ['computed.intersect', '@ember/object/computed', 'intersect', true],
  ['computed.lt', '@ember/object/computed', 'lt', true],
  ['computed.lte', '@ember/object/computed', 'lte', true],
  ['computed.map', '@ember/object/computed', 'map', true],
  ['computed.mapBy', '@ember/object/computed', 'mapBy', true],
  ['computed.match', '@ember/object/computed', 'match', true],
  ['computed.max', '@ember/object/computed', 'max', true],
  ['computed.min', '@ember/object/computed', 'min', true],
  ['computed.none', '@ember/object/computed', 'none', true],
  ['computed.not', '@ember/object/computed', 'not', true],
  ['computed.notEmpty', '@ember/object/computed', 'notEmpty', true],
  ['computed.oneWay', '@ember/object/computed', 'oneWay', true],
  ['computed.or', '@ember/object/computed', 'or', true],
  ['computed.readOnly', '@ember/object/computed', 'readOnly', true],
  ['computed.reads', '@ember/object/computed', 'reads', true],
  ['computed.setDiff', '@ember/object/computed', 'setDiff', true],
  ['computed.sort', '@ember/object/computed', 'sort', true],
  ['computed.sum', '@ember/object/computed', 'sum', true],
  ['computed.union', '@ember/object/computed', 'union', true],
  ['computed.uniq', '@ember/object/computed', 'uniq', true],
  ['computed.uniqBy', '@ember/object/computed', 'uniqBy', true],

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
  ['copy', '@ember/object/internals', 'copy'],
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

  // @ember/polyfills
  ['assign', '@ember/polyfills', 'assign'],
  ['platform.hasPropertyAccessors', '@ember/polyfills', 'hasPropertyAccessors'],
  ['merge', '@ember/polyfills', 'merge'],

  // @ember/routing/auto-location
  ['AutoLocation', '@ember/routing/auto-location', 'default'],

  // @ember/routing/hash-location
  ['HashLocation', '@ember/routing/hash-location', 'default'],

  // @ember/routing/history-location
  ['HistoryLocation', '@ember/routing/history-location', 'default'],

  // @ember/routing/link-component
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['LinkComponent', '@ember/-internals/glimmer'],

  // @ember/routing/location
  ['Location', '@ember/routing/location', 'default'],

  // @ember/routing/none-location
  ['NoneLocation', '@ember/routing/none-location', 'default'],

  // @ember/routing/route
  ['Route', '@ember/routing/route', 'default'],

  // @ember/routing/router
  ['Router', '@ember/routing/router', 'default'],

  // @ember/runloop
  ['run', '@ember/runloop', 'run'],
  ['run.backburner', '@ember/runloop', '_backburner', true],
  ['run.begin', '@ember/runloop', 'begin', true],
  ['run.bind', '@ember/runloop', 'bind', true],
  ['run.cancel', '@ember/runloop', 'cancel', true],
  ['run.debounce', '@ember/runloop', 'debounce', true],
  ['run.end', '@ember/runloop', 'end', true],
  ['run.hasScheduledTimers', '@ember/runloop', '_hasScheduledTimers', true],
  ['run.join', '@ember/runloop', 'join', true],
  ['run.later', '@ember/runloop', 'later', true],
  ['run.next', '@ember/runloop', 'next', true],
  ['run.once', '@ember/runloop', 'once', true],
  ['run.schedule', '@ember/runloop', 'schedule', true],
  ['run.scheduleOnce', '@ember/runloop', 'scheduleOnce', true],
  ['run.throttle', '@ember/runloop', 'throttle', true],
  [
    'run.currentRunLoop',
    '@ember/runloop',
    { get: DEBUG ? '_deprecatedGlobalGetCurrentRunLoop' : '_getCurrentRunLoop' },
    true,
  ],
  ['run.cancelTimers', '@ember/runloop', '_cancelTimers', true],

  // @ember/service
  ['Service', '@ember/service', 'default'],
  ['inject.service', '@ember/service', 'inject'],

  // @ember/string
  ['String.camelize', '@ember/string', 'camelize'],
  ['String.capitalize', '@ember/string', 'capitalize'],
  ['String.classify', '@ember/string', 'classify'],
  ['String.dasherize', '@ember/string', 'dasherize'],
  ['String.decamelize', '@ember/string', 'decamelize'],
  ['String.htmlSafe', '@ember/-internals/glimmer', 'htmlSafe'],
  ['String.isHTMLSafe', '@ember/-internals/glimmer', 'isHTMLSafe'],
  ['String.loc', '@ember/string', 'loc'],
  ['String.underscore', '@ember/string', 'underscore'],
  ['String.w', '@ember/string', 'w'],
  ['STRINGS', '@ember/string', { get: '_getStrings', set: '_setStrings' }],

  // @ember/template
  ['String.htmlSafe', '@ember/template', 'htmlSafe'],
  ['String.isHTMLSafe', '@ember/template', 'isHTMLSafe'],

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
  ['tryInvoke', '@ember/utils', 'tryInvoke'],
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
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['TextSupport', '@ember/-internals/views'],
  ['ComponentLookup', '@ember/-internals/views'],
  ['EventDispatcher', '@ember/-internals/views'],

  // @ember/-internals/glimmer
  ['TEMPLATES', '@ember/-internals/glimmer', { get: 'getTemplates', set: 'setTemplates' }],
  ['Handlebars.Utils.escapeExpression', '@ember/-internals/glimmer', 'escapeExpression'],

  // @ember/-internals/runtime
  ['_RegistryProxyMixin', '@ember/-internals/runtime', 'RegistryProxyMixin'],
  ['_ContainerProxyMixin', '@ember/-internals/runtime', 'ContainerProxyMixin'],
  ['Comparable', '@ember/-internals/runtime'],
  ['ActionHandler', '@ember/-internals/runtime'],
  ['NativeArray', '@ember/-internals/runtime'],
  ['Copyable', '@ember/-internals/runtime'],
  ['MutableEnumerable', '@ember/-internals/runtime'],
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS
    ? null
    : ['TargetActionSupport', '@ember/-internals/runtime'],
  ['ControllerMixin', '@ember/controller/lib/controller_mixin', 'default'],
  ['_ProxyMixin', '@ember/-internals/runtime'],

  // @ember/-internals/routing
  ['controllerFor', '@ember/-internals/routing'],
  ['generateControllerFactory', '@ember/-internals/routing'],
  ['generateController', '@ember/-internals/routing'],
  ['RouterDSL', '@ember/-internals/routing'],

  // backburner
  ['_Backburner', 'backburner', 'default'],

  // jquery
  ENV._JQUERY_INTEGRATION ? [null, 'jquery', 'default'] : null,

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

  // misc.
  ['platform.defineProperty', null, { value: true }],
].filter(Boolean);
