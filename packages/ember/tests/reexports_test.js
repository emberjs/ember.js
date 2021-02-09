import Ember from '../index';
import require from 'require';
import {
  FEATURES,
  EMBER_GLIMMER_HELPER_MANAGER,
  EMBER_GLIMMER_INVOKE_HELPER,
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
} from '@ember/canary-features';
import { confirmExport } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { jQueryDisabled, jQuery } from '@ember/-internals/views';
import Resolver from '@ember/application/globals-resolver';

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

        confirmExport(Ember, assert, path, moduleId, exportName, `Ember.${path} exports correctly`);
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
              : `Using Ember.${name} or importing from '${publicPath}' is deprecated. Install the \`ember-legacy-built-in-components\` addon and use \`import { ${name} } from 'ember-legacy-built-in-components';\` instead.`
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

    ['@test Ember.String.htmlSafe exports correctly (but deprecated)'](assert) {
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

    ['@test Ember.String.isHTMLSafe exports correctly (but deprecated)'](assert) {
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
  // @glimmer/runtime
  ['_templateOnlyComponent', '@glimmer/runtime', 'templateOnlyComponent'],
  ['_on', '@glimmer/runtime', 'on'],
  ['_fn', '@glimmer/runtime', 'fn'],
  ['_array', '@glimmer/runtime', 'array'],
  ['_hash', '@glimmer/runtime', 'hash'],
  ['_get', '@glimmer/runtime', 'get'],
  ['_concat', '@glimmer/runtime', 'concat'],

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

  // @ember/-internals/container
  ['Registry', '@ember/-internals/container', 'Registry'],
  ['Container', '@ember/-internals/container', 'Container'],

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
  ['_descriptor', '@ember/-internals/metal', 'nativeDescDecorator'],
  ['_tracked', '@ember/-internals/metal', 'tracked'],
  ['computed.alias', '@ember/-internals/metal', 'alias'],
  ['ComputedProperty', '@ember/-internals/metal'],
  ['_setClassicDecorator', '@ember/-internals/metal', 'setClassicDecorator'],
  ['cacheFor', '@ember/-internals/metal', 'getCachedValueFor'],
  ['merge', '@ember/polyfills'],
  ['instrument', '@ember/instrumentation'],
  ['subscribe', '@ember/instrumentation', 'subscribe'],
  ['Instrumentation.instrument', '@ember/instrumentation', 'instrument'],
  ['Instrumentation.subscribe', '@ember/instrumentation', 'subscribe'],
  ['Instrumentation.unsubscribe', '@ember/instrumentation', 'unsubscribe'],
  ['Instrumentation.reset', '@ember/instrumentation', 'reset'],
  ['testing', '@ember/debug', { get: 'isTesting', set: 'setTesting' }],
  ['onerror', '@ember/-internals/error-handling', { get: 'getOnerror', set: 'setOnerror' }],
  ['FEATURES.isEnabled', '@ember/canary-features', 'isEnabled'],
  ['meta', '@ember/-internals/meta'],
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
  ['notifyPropertyChange', '@ember/-internals/metal'],
  ['beginPropertyChanges', '@ember/-internals/metal'],
  ['endPropertyChanges', '@ember/-internals/metal'],
  ['changeProperties', '@ember/-internals/metal'],
  ['platform.defineProperty', null, { value: true }],
  ['platform.hasPropertyAccessors', null, { value: true }],
  ['defineProperty', '@ember/-internals/metal'],
  ['destroy', '@glimmer/destroyable', 'destroy'],
  ['libraries', '@ember/-internals/metal'],
  ['getProperties', '@ember/-internals/metal'],
  ['setProperties', '@ember/-internals/metal'],
  ['expandProperties', '@ember/-internals/metal'],
  ['addObserver', '@ember/-internals/metal'],
  ['removeObserver', '@ember/-internals/metal'],
  ['aliasMethod', '@ember/-internals/metal'],
  ['observer', '@ember/-internals/metal'],
  ['mixin', '@ember/-internals/metal'],
  ['Mixin', '@ember/-internals/metal'],

  // @ember/-internals/console
  ['Logger', '@ember/-internals/console', 'default'],

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
  ['Component', '@ember/-internals/glimmer', 'Component'],
  ['Helper', '@ember/-internals/glimmer', 'Helper'],
  ['Helper.helper', '@ember/-internals/glimmer', 'helper'],
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['Checkbox', '@ember/-internals/glimmer'],
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['LinkComponent', '@ember/-internals/glimmer'],
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['TextArea', '@ember/-internals/glimmer'],
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS ? null : ['TextField', '@ember/-internals/glimmer'],
  ['TEMPLATES', '@ember/-internals/glimmer', { get: 'getTemplates', set: 'setTemplates' }],
  ['Handlebars.template', '@ember/-internals/glimmer', 'template'],
  ['HTMLBars.template', '@ember/-internals/glimmer', 'template'],
  ['Handlebars.Utils.escapeExpression', '@ember/-internals/glimmer', 'escapeExpression'],
  ['_setComponentManager', '@ember/-internals/glimmer', 'setComponentManager'],
  ['_componentManagerCapabilities', '@ember/-internals/glimmer', 'componentCapabilities'],
  ['_setModifierManager', '@glimmer/manager', 'setModifierManager'],
  ['_modifierManagerCapabilities', '@ember/-internals/glimmer', 'modifierCapabilities'],
  ['_setComponentTemplate', '@glimmer/manager', 'setComponentTemplate'],
  ['_getComponentTemplate', '@glimmer/manager', 'getComponentTemplate'],
  EMBER_GLIMMER_HELPER_MANAGER
    ? ['_setHelperManager', '@glimmer/manager', 'setHelperManager']
    : null,
  EMBER_GLIMMER_HELPER_MANAGER
    ? ['_helperManagerCapabilities', '@glimmer/manager', 'helperCapabilities']
    : null,
  EMBER_GLIMMER_INVOKE_HELPER ? ['_invokeHelper', '@glimmer/runtime', 'invokeHelper'] : null,
  ['_captureRenderTree', '@ember/debug', 'captureRenderTree'],
  ['_Input', '@ember/-internals/glimmer', 'Input'],

  // @ember/-internals/runtime
  ['A', '@ember/-internals/runtime'],
  ['_RegistryProxyMixin', '@ember/-internals/runtime', 'RegistryProxyMixin'],
  ['_ContainerProxyMixin', '@ember/-internals/runtime', 'ContainerProxyMixin'],
  ['Object', '@ember/-internals/runtime'],
  ['String.loc', '@ember/string', 'loc'],
  ['String.w', '@ember/string', 'w'],
  ['String.dasherize', '@ember/string', 'dasherize'],
  ['String.decamelize', '@ember/string', 'decamelize'],
  ['String.camelize', '@ember/string', 'camelize'],
  ['String.classify', '@ember/string', 'classify'],
  ['String.underscore', '@ember/string', 'underscore'],
  ['String.capitalize', '@ember/string', 'capitalize'],
  ['compare', '@ember/-internals/runtime'],
  ['copy', '@ember/-internals/runtime'],
  ['isEqual', '@ember/-internals/runtime'],
  ['inject.controller', '@ember/controller', 'inject'],
  ['inject.service', '@ember/service', 'inject'],
  ['Array', '@ember/-internals/runtime'],
  ['Comparable', '@ember/-internals/runtime'],
  ['Namespace', '@ember/-internals/runtime'],
  ['Enumerable', '@ember/-internals/runtime'],
  ['ArrayProxy', '@ember/-internals/runtime'],
  ['ObjectProxy', '@ember/-internals/runtime'],
  ['ActionHandler', '@ember/-internals/runtime'],
  ['CoreObject', '@ember/-internals/runtime'],
  ['NativeArray', '@ember/-internals/runtime'],
  ['Copyable', '@ember/-internals/runtime'],
  ['MutableEnumerable', '@ember/-internals/runtime'],
  ['MutableArray', '@ember/-internals/runtime'],
  EMBER_MODERNIZED_BUILT_IN_COMPONENTS
    ? null
    : ['TargetActionSupport', '@ember/-internals/runtime'],
  ['Evented', '@ember/-internals/runtime'],
  ['PromiseProxyMixin', '@ember/-internals/runtime'],
  ['Observable', '@ember/-internals/runtime'],
  ['typeOf', '@ember/-internals/runtime'],
  ['isArray', '@ember/-internals/runtime'],
  ['Object', '@ember/-internals/runtime'],
  ['onLoad', '@ember/application'],
  ['runLoadHooks', '@ember/application'],
  ['Controller', '@ember/controller', 'default'],
  ['ControllerMixin', '@ember/controller/lib/controller_mixin', 'default'],
  ['Service', '@ember/service', 'default'],
  ['_ProxyMixin', '@ember/-internals/runtime'],
  ['RSVP', '@ember/-internals/runtime'],
  ['STRINGS', '@ember/string', { get: '_getStrings', set: '_setStrings' }],
  [
    'BOOTED',
    '@ember/-internals/metal',
    { get: 'isNamespaceSearchDisabled', set: 'setNamespaceSearchDisabled' },
  ],
  ['_action', '@ember/object', 'action'],
  ['_dependentKeyCompat', '@ember/object/compat', 'dependentKeyCompat'],
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

  // @ember/-internals/routing
  ['Location', '@ember/-internals/routing'],
  ['AutoLocation', '@ember/-internals/routing'],
  ['HashLocation', '@ember/-internals/routing'],
  ['HistoryLocation', '@ember/-internals/routing'],
  ['NoneLocation', '@ember/-internals/routing'],
  ['controllerFor', '@ember/-internals/routing'],
  ['generateControllerFactory', '@ember/-internals/routing'],
  ['generateController', '@ember/-internals/routing'],
  ['RouterDSL', '@ember/-internals/routing'],
  ['Router', '@ember/-internals/routing'],
  ['Route', '@ember/-internals/routing'],

  // ember-application
  ['Application', '@ember/application', 'default'],
  ['ApplicationInstance', '@ember/application/instance', 'default'],
  ['Engine', '@ember/engine', 'default'],
  ['EngineInstance', '@ember/engine/instance', 'default'],

  // @ember/-internals/extension-support
  ['DataAdapter', '@ember/-internals/extension-support'],
  ['ContainerDebugAdapter', '@ember/-internals/extension-support'],
].filter(Boolean);
