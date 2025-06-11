import Ember from '../index';
import { FEATURES } from '@ember/canary-features';
import {
  AbstractTestCase,
  confirmExport,
  expectDeprecation,
  moduleFor,
  testUnless,
} from 'internal-test-helpers';
import { DEBUG } from '@glimmer/env';

class ReExportTests extends AbstractTestCase {
  [`${testUnless(
    DEPRECATIONS.DEPRECATE_IMPORT_EMBER('---any---').isRemoved
  )} Ember exports correctly`](assert) {
    allExports.forEach((reexport) => {
      let [path, moduleId, exportName, mod] = reexport;

      // default path === exportName if none present
      if (!exportName) {
        exportName = path;
      }

      expectDeprecation(
        /'ember' barrel file is deprecated/,
        DEPRECATIONS.DEPRECATE_IMPORT_EMBER(path || exportName).isEnabled
      );

      confirmExport(Ember, assert, path, moduleId, exportName, mod);
    });
  }

  [`${testUnless(
    DEPRECATIONS.DEPRECATE_IMPORT_EMBER('FEATURES').isRemoved
  )} Ember.FEATURES is exported`](assert) {
    if (Object.keys(FEATURES).length === 0) {
      assert.expect(0);
    }

    for (let feature in FEATURES) {
      expectDeprecation(
        () => {
          assert.equal(
            Ember.FEATURES[feature],
            FEATURES[feature],
            'Ember.FEATURES contains ${feature} with correct value'
          );
        },
        /importing FEATURES from the 'ember' barrel file is deprecated/,
        DEPRECATIONS.DEPRECATE_IMPORT_EMBER('FEATURES').isEnabled
      );
    }
  }
}

moduleFor('ember reexports', ReExportTests);

import * as test0 from '@ember/application';
import * as test1 from '@ember/application/instance';
import * as test2 from '@ember/application/namespace';
import * as test6 from '@ember/canary-features';
import * as test7 from '@ember/component';
import * as test8 from '@ember/component/helper';
import * as test9 from '@ember/component/template-only';
import * as test10 from '@ember/controller';
import * as test11 from '@ember/debug';
import * as test12 from '@ember/debug/container-debug-adapter';
import * as test13 from '@ember/debug/data-adapter';
import * as test14 from '@ember/destroyable';
import * as test15 from '@ember/engine';
import * as test16 from '@ember/engine/instance';
import * as test18 from '@ember/instrumentation';
import * as test19 from '@ember/modifier';
import * as test20 from '@ember/helper';
import * as test21 from '@ember/object';
import * as test22 from '@ember/object/compat';
import * as test23 from '@ember/object/computed';
import * as test24 from '@ember/object/core';
import * as test26 from '@ember/object/events';
import * as test27 from '@ember/object/internals';
import * as test28 from '@ember/object/mixin';
import * as test30 from '@ember/object/observers';
import * as test33 from '@ember/routing/hash-location';
import * as test34 from '@ember/routing/history-location';
import * as test35 from '@ember/routing/none-location';
import * as test36 from '@ember/routing/route';
import * as test37 from '@ember/routing/router';
import * as test38 from '@ember/runloop';
import * as test39 from '@ember/service';
import * as test40 from '@ember/template';
import * as test41 from '@ember/template-compilation';
import * as test42 from '@ember/template-factory';
import * as test43 from '@ember/test';
import * as test44 from '@ember/test/adapter';
import * as test45 from '@ember/utils';
import * as test46 from '@ember/version';
import * as test47 from '@glimmer/tracking';
import * as test48 from '@glimmer/tracking/primitives/cache';
import * as test49 from '@ember/-internals/environment';
import * as test50 from '@ember/-internals/utils';
import * as test51 from '@ember/-internals/container';
import * as test52 from '@ember/-internals/metal';
import * as test53 from '@ember/-internals/error-handling';
import * as test54 from '@ember/-internals/meta';
import * as test55 from '@ember/-internals/views';
import * as test56 from '@ember/-internals/glimmer';
import * as test58 from '@ember/-internals/routing';
import * as test59 from 'backburner.js';
import * as test60 from 'rsvp';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

let allExports = [
  ['Application', '@ember/application', 'default', test0],
  ['getOwner', '@ember/application', 'getOwner', test0],
  ['onLoad', '@ember/application', 'onLoad', test0],
  ['runLoadHooks', '@ember/application', 'runLoadHooks', test0],
  ['setOwner', '@ember/application', 'setOwner', test0],
  ['ApplicationInstance', '@ember/application/instance', 'default', test1],
  ['Namespace', '@ember/application/namespace', 'default', test2],
  ['FEATURES.isEnabled', '@ember/canary-features', 'isEnabled', test6],
  ['Component', '@ember/component', 'default', test7],
  ['_componentManagerCapabilities', '@ember/component', 'capabilities', test7],
  ['_getComponentTemplate', '@ember/component', 'getComponentTemplate', test7],
  ['_setComponentManager', '@ember/component', 'setComponentManager', test7],
  ['_setComponentTemplate', '@ember/component', 'setComponentTemplate', test7],
  ['Helper', '@ember/component/helper', 'default', test8],
  ['Helper.helper', '@ember/component/helper', 'helper', test8],
  ['_templateOnlyComponent', '@ember/component/template-only', 'default', test9],
  ['Controller', '@ember/controller', 'default', test10],
  ['inject.controller', '@ember/controller', 'inject', test10],
  ['deprecateFunc', '@ember/debug', 'deprecateFunc', test11],
  ['deprecate', '@ember/debug', 'deprecate', test11],
  ['assert', '@ember/debug', 'assert', test11],
  ['debug', '@ember/debug', 'debug', test11],
  ['inspect', '@ember/debug', 'inspect', test11],
  ['Debug.registerDeprecationHandler', '@ember/debug', 'registerDeprecationHandler', test11],
  ['Debug.registerWarnHandler', '@ember/debug', 'registerWarnHandler', test11],
  ['runInDebug', '@ember/debug', 'runInDebug', test11],
  ['warn', '@ember/debug', 'warn', test11],
  [
    'testing',
    '@ember/debug',
    {
      get: 'isTesting',
      set: 'setTesting',
    },
    test11,
  ],
  ['_captureRenderTree', '@ember/debug', 'captureRenderTree', test11],
  ['ContainerDebugAdapter', '@ember/debug/container-debug-adapter', 'default', test12],
  ['DataAdapter', '@ember/debug/data-adapter', 'default', test13],
  DEBUG
    ? ['_assertDestroyablesDestroyed', '@ember/destroyable', 'assertDestroyablesDestroyed', test14]
    : null,
  ['_associateDestroyableChild', '@ember/destroyable', 'associateDestroyableChild', test14],
  ['destroy', '@ember/destroyable', 'destroy', test14],
  DEBUG
    ? ['_enableDestroyableTracking', '@ember/destroyable', 'enableDestroyableTracking', test14]
    : null,
  ['_isDestroyed', '@ember/destroyable', 'isDestroyed', test14],
  ['_isDestroying', '@ember/destroyable', 'isDestroying', test14],
  ['_registerDestructor', '@ember/destroyable', 'registerDestructor', test14],
  ['_unregisterDestructor', '@ember/destroyable', 'unregisterDestructor', test14],
  ['Engine', '@ember/engine', 'default', test15],
  ['EngineInstance', '@ember/engine/instance', 'default', test16],
  ['instrument', '@ember/instrumentation', 'instrument', test18],
  ['subscribe', '@ember/instrumentation', 'subscribe', test18],
  ['Instrumentation.instrument', '@ember/instrumentation', 'instrument', test18],
  ['Instrumentation.reset', '@ember/instrumentation', 'reset', test18],
  ['Instrumentation.subscribe', '@ember/instrumentation', 'subscribe', test18],
  ['Instrumentation.unsubscribe', '@ember/instrumentation', 'unsubscribe', test18],
  ['_modifierManagerCapabilities', '@ember/modifier', 'capabilities', test19],
  ['_setModifierManager', '@ember/modifier', 'setModifierManager', test19],
  ['_on', '@ember/modifier', 'on', test19],
  ['_helperManagerCapabilities', '@ember/helper', 'capabilities', test20],
  ['_setHelperManager', '@ember/helper', 'setHelperManager', test20],
  ['_invokeHelper', '@ember/helper', 'invokeHelper', test20],
  ['_fn', '@ember/helper', 'fn', test20],
  ['_array', '@ember/helper', 'array', test20],
  ['_hash', '@ember/helper', 'hash', test20],
  ['_get', '@ember/helper', 'get', test20],
  ['_concat', '@ember/helper', 'concat', test20],
  ['Object', '@ember/object', 'default', test21],
  ['_action', '@ember/object', 'action', test21],
  ['computed', '@ember/object', 'computed', test21],
  ['defineProperty', '@ember/object', 'defineProperty', test21],
  ['get', '@ember/object', 'get', test21],
  ['getProperties', '@ember/object', 'getProperties', test21],
  ['notifyPropertyChange', '@ember/object', 'notifyPropertyChange', test21],
  ['observer', '@ember/object', 'observer', test21],
  ['set', '@ember/object', 'set', test21],
  ['setProperties', '@ember/object', 'setProperties', test21],
  ['trySet', '@ember/object', 'trySet', test21],
  ['_dependentKeyCompat', '@ember/object/compat', 'dependentKeyCompat', test22],
  ['ComputedProperty', '@ember/object/computed', 'default', test23],
  ['expandProperties', '@ember/object/computed', 'expandProperties', test23],
  ['CoreObject', '@ember/object/core', 'default', test24],
  ['addListener', '@ember/object/events', 'addListener', test26],
  ['removeListener', '@ember/object/events', 'removeListener', test26],
  ['sendEvent', '@ember/object/events', 'sendEvent', test26],
  ['cacheFor', '@ember/object/internals', 'cacheFor', test27],
  ['guidFor', '@ember/object/internals', 'guidFor', test27],
  ['Mixin', '@ember/object/mixin', 'default', test28],
  ['addObserver', '@ember/object/observers', 'addObserver', test30],
  ['removeObserver', '@ember/object/observers', 'removeObserver', test30],
  ['HashLocation', '@ember/routing/hash-location', 'default', test33],
  ['HistoryLocation', '@ember/routing/history-location', 'default', test34],
  ['NoneLocation', '@ember/routing/none-location', 'default', test35],
  ['Route', '@ember/routing/route', 'default', test36],
  ['Router', '@ember/routing/router', 'default', test37],
  ['run', '@ember/runloop', 'run', test38],
  ['Service', '@ember/service', 'default', test39],
  ['inject.service', '@ember/service', 'service', test39],
  [null, '@ember/template', 'htmlSafe', test40],
  [null, '@ember/template', 'isHTMLSafe', test40],
  ['HTMLBars.compile', '@ember/template-compilation', 'compileTemplate', test41],
  ['Handlebars.template', '@ember/template-factory', 'createTemplateFactory', test42],
  ['HTMLBars.template', '@ember/template-factory', 'createTemplateFactory', test42],
  ['Test.registerAsyncHelper', '@ember/test', 'registerAsyncHelper', test43],
  ['Test.registerHelper', '@ember/test', 'registerHelper', test43],
  ['Test.registerWaiter', '@ember/test', 'registerWaiter', test43],
  ['Test.unregisterHelper', '@ember/test', 'unregisterHelper', test43],
  ['Test.unregisterWaiter', '@ember/test', 'unregisterWaiter', test43],
  ['Test.Adapter', '@ember/test/adapter', 'default', test44],
  ['compare', '@ember/utils', 'compare', test45],
  ['isBlank', '@ember/utils', 'isBlank', test45],
  ['isEmpty', '@ember/utils', 'isEmpty', test45],
  ['isEqual', '@ember/utils', 'isEqual', test45],
  ['isNone', '@ember/utils', 'isNone', test45],
  ['isPresent', '@ember/utils', 'isPresent', test45],
  ['typeOf', '@ember/utils', 'typeOf', test45],
  ['VERSION', '@ember/version', 'VERSION', test46],
  ['_tracked', '@glimmer/tracking', 'tracked', test47],
  ['_createCache', '@glimmer/tracking/primitives/cache', 'createCache', test48],
  ['_cacheGetValue', '@glimmer/tracking/primitives/cache', 'getValue', test48],
  ['_cacheIsConst', '@glimmer/tracking/primitives/cache', 'isConst', test48],
  [
    'ENV',
    '@ember/-internals/environment',
    {
      get: 'getENV',
    },
    test49,
  ],
  [
    'lookup',
    '@ember/-internals/environment',
    {
      get: 'getLookup',
      set: 'setLookup',
    },
    test49,
  ],
  ['GUID_KEY', '@ember/-internals/utils', null, test50],
  ['uuid', '@ember/-internals/utils', null, test50],
  ['generateGuid', '@ember/-internals/utils', null, test50],
  ['canInvoke', '@ember/-internals/utils', null, test50],
  ['wrap', '@ember/-internals/utils', null, test50],
  ['_Cache', '@ember/-internals/utils', 'Cache', test50],
  ['Registry', '@ember/-internals/container', 'Registry', test51],
  ['Container', '@ember/-internals/container', 'Container', test51],
  ['_descriptor', '@ember/-internals/metal', 'nativeDescDecorator', test52],
  ['_setClassicDecorator', '@ember/-internals/metal', 'setClassicDecorator', test52],
  ['_getPath', '@ember/-internals/metal', null, test52],
  ['hasListeners', '@ember/-internals/metal', null, test52],
  ['beginPropertyChanges', '@ember/-internals/metal', null, test52],
  ['endPropertyChanges', '@ember/-internals/metal', null, test52],
  ['changeProperties', '@ember/-internals/metal', null, test52],
  ['libraries', '@ember/-internals/metal', null, test52],
  [
    'BOOTED',
    '@ember/-internals/metal',
    {
      get: 'isNamespaceSearchDisabled',
      set: 'setNamespaceSearchDisabled',
    },
    test52,
  ],
  [
    'onerror',
    '@ember/-internals/error-handling',
    {
      get: 'getOnerror',
      set: 'setOnerror',
    },
    test53,
  ],
  ['meta', '@ember/-internals/meta', null, test54],
  ['ViewUtils.isSimpleClick', '@ember/-internals/views', 'isSimpleClick', test55],
  ['ViewUtils.getElementView', '@ember/-internals/views', 'getElementView', test55],
  ['ViewUtils.getViewElement', '@ember/-internals/views', 'getViewElement', test55],
  ['ViewUtils.getViewBounds', '@ember/-internals/views', 'getViewBounds', test55],
  ['ViewUtils.getViewClientRects', '@ember/-internals/views', 'getViewClientRects', test55],
  [
    'ViewUtils.getViewBoundingClientRect',
    '@ember/-internals/views',
    'getViewBoundingClientRect',
    test55,
  ],
  ['ViewUtils.getRootViews', '@ember/-internals/views', 'getRootViews', test55],
  ['ViewUtils.getChildViews', '@ember/-internals/views', 'getChildViews', test55],
  [
    'ViewUtils.isSerializationFirstNode',
    '@ember/-internals/glimmer',
    'isSerializationFirstNode',
    test56,
  ],
  ['ComponentLookup', '@ember/-internals/views', null, test55],
  ['EventDispatcher', '@ember/-internals/views', null, test55],
  [
    'TEMPLATES',
    '@ember/-internals/glimmer',
    {
      get: 'getTemplates',
      set: 'setTemplates',
    },
    test56,
  ],
  ['_Input', '@ember/-internals/glimmer', 'Input', test56],
  ['controllerFor', '@ember/-internals/routing', null, test58],
  ['generateControllerFactory', '@ember/-internals/routing', null, test58],
  ['generateController', '@ember/-internals/routing', null, test58],
  ['RouterDSL', '@ember/-internals/routing', null, test58],
  ['_Backburner', 'backburner.js', 'default', test59],
  [null, 'rsvp', 'default', test60],
  [null, 'rsvp', 'Promise', test60],
  [null, 'rsvp', 'all', test60],
  [null, 'rsvp', 'allSettled', test60],
  [null, 'rsvp', 'defer', test60],
  [null, 'rsvp', 'denodeify', test60],
  [null, 'rsvp', 'filter', test60],
  [null, 'rsvp', 'hash', test60],
  [null, 'rsvp', 'hashSettled', test60],
  [null, 'rsvp', 'map', test60],
  [null, 'rsvp', 'off', test60],
  [null, 'rsvp', 'on', test60],
  [null, 'rsvp', 'race', test60],
  [null, 'rsvp', 'reject', test60],
  [null, 'rsvp', 'resolve', test60],
].filter(Boolean);
