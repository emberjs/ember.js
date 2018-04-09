import require, { has } from 'require';

import { ENV, context } from 'ember-environment';
import { IS_NODE, module } from 'node-module';
import * as metal from 'ember-metal';
import { runLoadHooks } from 'ember-runtime';
import { htmlSafe } from 'ember-glimmer';
import VERSION from './version';
import * as application from 'ember-application';

const Ember = (typeof context.imports.Ember === 'object' && context.imports.Ember) || {};
Ember.Debug = {};
Ember.platform = {
  defineProperty: true,
  hasPropertyAccessors: true,
};
Ember.Instrumentation = {};
Ember.ViewUtils = {};
Ember.Handlebars = { Utils: {} };
Ember.HTMLBars = {};

function setupSimpleExport(object, name, moduleName, exportName) {
  let value;
  Object.defineProperty(object, name, {
    get() {
      if (value === undefined) {
        value = require(moduleName)[exportName || name];
      }

      return value;
    },
  });
}

function setupDynamicExport(object, name, moduleName, exportNames) {
  let module = require(moduleName);

  let descriptor = {
    get: module[exportNames.get],
  };

  if (exportNames.set) {
    descriptor.set = module[exportNames.set];
  }

  Object.defineProperty(object, name, descriptor);
}

let topLevelExports = [
  [Ember, 'ENV', 'ember-environment', { get: 'getENV' }],
  [Ember, 'lookup', 'ember-environment', { get: 'getLookup', set: 'setLookup' }],

  [Ember, 'getOwner', 'ember-utils'],
  [Ember, 'setOwner', 'ember-utils'],
  [Ember, 'assign', 'ember-utils'],
  [Ember, 'GUID_KEY', 'ember-utils'],
  [Ember, 'uuid', 'ember-utils'],
  [Ember, 'generateGuid', 'ember-utils'],
  [Ember, 'guidFor', 'ember-utils'],
  [Ember, 'inspect', 'ember-utils'],
  [Ember, 'makeArray', 'ember-utils'],
  [Ember, 'canInvoke', 'ember-utils'],
  [Ember, 'tryInvoke', 'ember-utils'],
  [Ember, 'wrap', 'ember-utils'],
  [Ember, 'NAME_KEY', 'ember-utils'],

  [Ember, 'Registry', 'container'],
  [Ember, 'Container', 'container'],

  [Ember, 'deprecateFunc', 'ember-debug'],
  [Ember, 'deprecate', 'ember-debug'],
  [Ember, 'assert', 'ember-debug'],
  [Ember, 'warn', 'ember-debug'],
  [Ember, 'debug', 'ember-debug'],
  [Ember, 'runInDebug', 'ember-debug'],
  [Ember, 'Error', 'ember-debug'],
  [Ember.Debug, 'registerDeprecationHandler', 'ember-debug', 'registerDeprecationHandler'],
  [Ember.Debug, 'registerWarnHandler', 'ember-debug', 'registerWarnHandler'],

  [Ember, 'computed', 'ember-metal', '_globalsComputed'],
  [Ember, 'ComputedProperty', 'ember-metal'],
  [Ember, 'cacheFor', 'ember-metal', 'getCachedValueFor'],
  [Ember, 'merge', 'ember-metal'],
  [Ember, 'instrument', 'ember-metal'],
  [Ember, 'subscribe', 'ember-metal', 'instrumentationSubscribe'],
  [Ember.Instrumentation, 'instrument', 'ember-metal', 'instrument'],
  [Ember.Instrumentation, 'subscribe', 'ember-metal', 'instrumentationSubscribe'],
  [Ember.Instrumentation, 'unsubscribe', 'ember-metal', 'instrumentationUnsubscribe'],
  [Ember.Instrumentation, 'reset', 'ember-metal', 'instrumentationReset'],

  [Ember, 'testing', 'ember-debug', { get: 'isTesting', set: 'setTesting' }],
  [Ember, 'onerror', 'ember-metal', { get: 'getOnerror', set: 'setOnerror' }],
  [Ember, 'FEATURES', 'ember/features'],
  [Ember, 'meta', 'ember-metal'],
  [Ember, 'get', 'ember-metal'],
  [Ember, 'set', 'ember-metal'],
  [Ember, '_getPath', 'ember-metal'],
  [Ember, 'getWithDefault', 'ember-metal'],
  [Ember, 'trySet', 'ember-metal'],
  [Ember, '_Cache', 'ember-metal', 'Cache'],
  [Ember, 'on', 'ember-metal'],
  [Ember, 'addListener', 'ember-metal'],
  [Ember, 'removeListener', 'ember-metal'],
  [Ember, 'sendEvent', 'ember-metal'],
  [Ember, 'hasListeners', 'ember-metal'],
  [Ember, 'isNone', 'ember-metal'],
  [Ember, 'isEmpty', 'ember-metal'],
  [Ember, 'isBlank', 'ember-metal'],
  [Ember, 'isPresent', 'ember-metal'],
  [Ember, '_Backburner', 'backburner', 'default'],
  [Ember, 'run', 'ember-metal', '_globalsRun'],
  [Ember, 'propertyWillChange', 'ember-metal'],
  [Ember, 'propertyDidChange', 'ember-metal'],
  [Ember, 'notifyPropertyChange', 'ember-metal'],
  [Ember, 'overrideChains', 'ember-metal'],
  [Ember, 'beginPropertyChanges', 'ember-metal'],
  [Ember, 'endPropertyChanges', 'ember-metal'],
  [Ember, 'changeProperties', 'ember-metal'],
  [Ember, 'defineProperty', 'ember-metal'],
  [Ember, 'watchKey', 'ember-metal'],
  [Ember, 'unwatchKey', 'ember-metal'],
  [Ember, 'removeChainWatcher', 'ember-metal'],
  [Ember, '_ChainNode', 'ember-metal', 'ChainNode'],
  [Ember, 'finishChains', 'ember-metal'],
  [Ember, 'watchPath', 'ember-metal'],
  [Ember, 'unwatchPath', 'ember-metal'],
  [Ember, 'watch', 'ember-metal'],
  [Ember, 'isWatching', 'ember-metal'],
  [Ember, 'unwatch', 'ember-metal'],
  [Ember, 'destroy', 'ember-metal', 'deleteMeta'],
  [Ember, 'libraries', 'ember-metal'],
  [Ember, 'OrderedSet', 'ember-metal'],
  [Ember, 'Map', 'ember-metal'],
  [Ember, 'MapWithDefault', 'ember-metal'],
  [Ember, 'getProperties', 'ember-metal'],
  [Ember, 'setProperties', 'ember-metal'],
  [Ember, 'expandProperties', 'ember-metal'],
  [Ember, 'addObserver', 'ember-metal'],
  [Ember, 'removeObserver', 'ember-metal'],
  [Ember, 'aliasMethod', 'ember-metal'],
  [Ember, 'observer', 'ember-metal'],
  [Ember, 'mixin', 'ember-metal'],
  [Ember, 'Mixin', 'ember-metal'],

  [Ember, 'Logger', 'ember-console', 'default'],

  [Ember, '$', 'ember-views', 'jQuery'],
  [Ember.ViewUtils, 'isSimpleClick', 'ember-views', 'isSimpleClick'],
  [Ember.ViewUtils, 'getViewElement', 'ember-views', 'getViewElement'],
  [Ember.ViewUtils, 'getViewBounds', 'ember-views', 'getViewBounds'],
  [Ember.ViewUtils, 'getViewClientRects', 'ember-views', 'getViewClientRects'],
  [Ember.ViewUtils, 'getViewBoundingClientRect', 'ember-views', 'getViewBoundingClientRect'],
  [Ember.ViewUtils, 'getRootViews', 'ember-views', 'getRootViews'],
  [Ember.ViewUtils, 'getChildViews', 'ember-views', 'getChildViews'],
  [Ember.ViewUtils, 'isSerializationFirstNode', 'ember-glimmer', 'isSerializationFirstNode'],
  [Ember, 'TextSupport', 'ember-views'],
  [Ember, 'ComponentLookup', 'ember-views'],
  [Ember, 'EventDispatcher', 'ember-views'],

  [Ember, 'A', 'ember-runtime'],
  [Ember, '_RegistryProxyMixin', 'ember-runtime', 'RegistryProxyMixin'],
  [Ember, '_ContainerProxyMixin', 'ember-runtime', 'ContainerProxyMixin'],
  [Ember, 'Object', 'ember-runtime'],
  [Ember, 'String', 'ember-runtime'],
  [Ember, 'compare', 'ember-runtime'],
  [Ember, 'copy', 'ember-runtime'],
  [Ember, 'isEqual', 'ember-runtime'],
  [Ember, 'inject', 'ember-runtime'],
  [Ember, 'Array', 'ember-runtime'],
  [Ember, 'Comparable', 'ember-runtime'],
  [Ember, 'Namespace', 'ember-runtime'],
  [Ember, 'Enumerable', 'ember-runtime'],
  [Ember, 'ArrayProxy', 'ember-runtime'],
  [Ember, 'ObjectProxy', 'ember-runtime'],
  [Ember, 'ActionHandler', 'ember-runtime'],
  [Ember, 'CoreObject', 'ember-runtime'],
  [Ember, 'NativeArray', 'ember-runtime'],
  [Ember, 'Copyable', 'ember-runtime'],
  [Ember, 'MutableEnumerable', 'ember-runtime'],
  [Ember, 'MutableArray', 'ember-runtime'],
  [Ember, 'TargetActionSupport', 'ember-runtime'],
  [Ember, 'Evented', 'ember-runtime'],
  [Ember, 'PromiseProxyMixin', 'ember-runtime'],
  [Ember, 'Observable', 'ember-runtime'],
  [Ember, 'typeOf', 'ember-runtime'],
  [Ember, 'isArray', 'ember-runtime'],
  [Ember, 'onLoad', 'ember-runtime'],
  [Ember, 'runLoadHooks', 'ember-runtime'],
  [Ember, 'Controller', 'ember-runtime'],
  [Ember, 'ControllerMixin', 'ember-runtime'],
  [Ember, 'Service', 'ember-runtime'],
  [Ember, '_ProxyMixin', 'ember-runtime'],
  [Ember, 'RSVP', 'ember-runtime'],
  [Ember, 'STRINGS', 'ember-runtime', { get: 'getStrings', set: 'setStrings' }],
  [
    Ember,
    'BOOTED',
    'ember-metal',
    { get: 'isNamespaceSearchDisabled', set: 'setNamespaceSearchDisabled' },
  ],

  [Ember, 'Component', 'ember-glimmer'],
  [Ember, 'Helper', 'ember-glimmer'],
  [Ember, 'Checkbox', 'ember-glimmer'],
  [Ember, 'LinkComponent', 'ember-glimmer'],
  [Ember, 'TextArea', 'ember-glimmer'],
  [Ember, 'TextField', 'ember-glimmer'],
  [Ember, 'TEMPLATES', 'ember-glimmer', { get: 'getTemplates', set: 'setTemplates' }],
  [Ember, '_setComponentManager', 'ember-glimmer', 'componentManager'],

  [Ember, 'Location', 'ember-routing'],
  [Ember, 'AutoLocation', 'ember-routing'],
  [Ember, 'HashLocation', 'ember-routing'],
  [Ember, 'HistoryLocation', 'ember-routing'],
  [Ember, 'NoneLocation', 'ember-routing'],
  [Ember, 'controllerFor', 'ember-routing'],
  [Ember, 'generateControllerFactory', 'ember-routing'],
  [Ember, 'generateController', 'ember-routing'],
  [Ember, 'RouterDSL', 'ember-routing'],
  [Ember, 'Router', 'ember-routing'],
  [Ember, 'Route', 'ember-routing'],

  [Ember, 'Application', 'ember-application'],
  [Ember, 'ApplicationInstance', 'ember-application'],
  [Ember, 'Engine', 'ember-application'],
  [Ember, 'EngineInstance', 'ember-application'],
  [Ember, 'Resolver', 'ember-application'],
  [Ember, 'DefaultResolver', 'ember-application', 'Resolver'],

  [Ember, 'DataAdapter', 'ember-extension-support'],
  [Ember, 'ContainerDebugAdapter', 'ember-extension-support'],
];
for (let i = 0; i < topLevelExports.length; i++) {
  if (typeof topLevelExports[i][3] === 'object') {
    setupDynamicExport(...topLevelExports[i]);
  } else {
    setupSimpleExport(...topLevelExports[i]);
  }
}

setupSimpleExport(Ember.FEATURES, 'isEnabled', 'ember-debug', 'isFeatureEnabled');
setupSimpleExport(Ember.Helper, 'helper', 'ember-glimmer');
setupSimpleExport(Ember.Handlebars.Utils, 'escapeExpression', 'ember-glimmer');
setupSimpleExport(Ember.Handlebars, 'template', 'ember-glimmer');
setupSimpleExport(Ember.HTMLBars, 'template', 'ember-glimmer');
setupSimpleExport(Ember.String, 'htmlSafe', 'ember-glimmer');
setupSimpleExport(Ember.String, 'isHTMLSafe', 'ember-glimmer');

let runExports = [
  ['backburner', 'ember-metal', 'backburner'],
  ['begin', 'ember-metal', 'begin'],
  ['bind', 'ember-metal', 'bind'],
  ['cancel', 'ember-metal', 'cancel'],
  ['debounce', 'ember-metal', 'debounce'],
  ['end', 'ember-metal', 'end'],
  ['hasScheduledTimers', 'ember-metal', 'hasScheduledTimers'],
  ['join', 'ember-metal', 'join'],
  ['later', 'ember-metal', 'later'],
  ['next', 'ember-metal', 'next'],
  ['once', 'ember-metal', 'once'],
  ['schedule', 'ember-metal', 'schedule'],
  ['scheduleOnce', 'ember-metal', 'scheduleOnce'],
  ['throttle', 'ember-metal', 'throttle'],
];
for (let i = 0; i < runExports.length; i++) {
  setupSimpleExport(Ember.run, ...runExports[i]);
}
setupDynamicExport(Ember.run, 'currentRunLoop', 'ember-metal', { get: 'getCurrentRunLoop' });

let computedExports = [
  ['alias', 'ember-metal'],
  ['empty', 'ember-runtime'],
  ['notEmpty', 'ember-runtime'],
  ['none', 'ember-runtime'],
  ['not', 'ember-runtime'],
  ['bool', 'ember-runtime'],
  ['match', 'ember-runtime'],
  ['equal', 'ember-runtime'],
  ['gt', 'ember-runtime'],
  ['gte', 'ember-runtime'],
  ['lt', 'ember-runtime'],
  ['lte', 'ember-runtime'],
  ['oneWay', 'ember-runtime'],
  ['reads', 'ember-runtime', 'oneWay'],
  ['readOnly', 'ember-runtime'],
  ['deprecatingAlias', 'ember-runtime'],
  ['and', 'ember-runtime'],
  ['or', 'ember-runtime'],
  ['sum', 'ember-runtime'],
  ['min', 'ember-runtime'],
  ['max', 'ember-runtime'],
  ['map', 'ember-runtime'],
  ['sort', 'ember-runtime'],
  ['setDiff', 'ember-runtime'],
  ['mapBy', 'ember-runtime'],
  ['filter', 'ember-runtime'],
  ['filterBy', 'ember-runtime'],
  ['uniq', 'ember-runtime'],
  ['uniqBy', 'ember-runtime'],
  ['union', 'ember-runtime'],
  ['intersect', 'ember-runtime'],
  ['collect', 'ember-runtime'],
];
for (let i = 0; i < computedExports.length; i++) {
  setupSimpleExport(Ember.computed, ...computedExports[i]);
}

Ember.isNamespace = true;
Ember.toString = function() {
  return 'Ember';
};

/**
  A function may be assigned to `Ember.onerror` to be called when Ember
  internals encounter an error. This is useful for specialized error handling
  and reporting code.

  ```javascript
  import $ from 'jquery';

  Ember.onerror = function(error) {
    $.ajax('/report-error', 'POST', {
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

/**
  Defines the hash of localized strings for the current language. Used by
  the `String.loc` helper. To localize, add string values to this
  hash.

  @property STRINGS
  @for Ember
  @type Object
  @private
*/

/**
  Whether searching on the global for new Namespace instances is enabled.

  This is only exported here as to not break any addons.  Given the new
  visit API, you will have issues if you treat this as a indicator of
  booted.

  Internally this is only exposing a flag in Namespace.

  @property BOOTED
  @for Ember
  @type Boolean
  @private
*/

if (ENV.EXTEND_PROTOTYPES.String) {
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}

/**
  Global hash of shared templates. This will automatically be populated
  by the build tools so that you can store your Handlebars templates in
  separate files that get loaded into JavaScript at buildtime.

  @property TEMPLATES
  @for Ember
  @type Object
  @private
*/

/**
  The semantic version

  @property VERSION
  @type String
  @public
*/
Ember.VERSION = VERSION;

metal.libraries.registerCoreLibrary('Ember', VERSION);

runLoadHooks('Ember.Application', application.Application);

if (has('ember-template-compiler')) {
  require('ember-template-compiler');
}

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
if (has('ember-testing')) {
  let testing = require('ember-testing');

  Ember.Test = testing.Test;
  Ember.Test.Adapter = testing.Adapter;
  Ember.Test.QUnitAdapter = testing.QUnitAdapter;
  Ember.setupForTesting = testing.setupForTesting;
}

runLoadHooks('Ember');

export default Ember;

if (IS_NODE) {
  module.exports = Ember;
} else {
  context.exports.Ember = context.exports.Em = Ember;
}
