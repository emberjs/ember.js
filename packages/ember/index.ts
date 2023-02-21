/**
@module ember
*/

import require, { has } from 'require';

import { getENV, getLookup, setLookup } from '@ember/-internals/environment';
import * as utils from '@ember/-internals/utils';
import { Registry, Container } from '@ember/-internals/container';
import * as instrumentation from '@ember/instrumentation';
import { meta } from '@ember/-internals/meta';
import * as metal from '@ember/-internals/metal';
import { FEATURES, isEnabled } from '@ember/canary-features';
import * as EmberDebug from '@ember/debug';
import { assert, captureRenderTree, deprecate } from '@ember/debug';
import Backburner from 'backburner';
import Controller, { inject as injectController, ControllerMixin } from '@ember/controller';
import {
  _getStrings,
  _setStrings,
  dasherize,
  camelize,
  capitalize,
  classify,
  decamelize,
  underscore,
  w,
} from '@ember/string';
import Service, { service } from '@ember/service';

import EmberObject, {
  action,
  computed,
  defineProperty,
  notifyPropertyChange,
  observer,
  get,
  getProperties,
  set,
  setProperties,
  trySet,
} from '@ember/object';
import { cacheFor } from '@ember/object/-internals';
import { dependentKeyCompat } from '@ember/object/compat';
import ComputedProperty, { expandProperties } from '@ember/object/computed';
import { addListener, removeListener, sendEvent } from '@ember/object/events';

import {
  RegistryProxyMixin,
  ContainerProxyMixin,
  _ProxyMixin,
  RSVP,
  Comparable,
  ActionHandler,
} from '@ember/-internals/runtime';
import {
  componentCapabilities,
  modifierCapabilities,
  setComponentManager,
  escapeExpression,
  getTemplates,
  htmlSafe,
  isHTMLSafe,
  setTemplates,
  template,
  isSerializationFirstNode,
  type TemplatesRegistry,
} from '@ember/-internals/glimmer';
import VERSION from './version';
import * as views from '@ember/-internals/views';
import ContainerDebugAdapter from '@ember/debug/container-debug-adapter';
import DataAdapter from '@ember/debug/data-adapter';
import { run } from '@ember/runloop';
import { getOnerror, setOnerror } from '@ember/-internals/error-handling';
import EmberArray, { A, NativeArray, isArray, makeArray } from '@ember/array';
import MutableArray from '@ember/array/mutable';
import ArrayProxy from '@ember/array/proxy';
import Application, { getOwner, setOwner, onLoad, runLoadHooks } from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import Namespace from '@ember/application/namespace';
import Component, { Input } from '@ember/component';
import Helper from '@ember/component/helper';
import Engine from '@ember/engine';
import EngineInstance from '@ember/engine/instance';
import Enumerable from '@ember/enumerable';
import MutableEnumerable from '@ember/enumerable/mutable';
import CoreObject from '@ember/object/core';
import Evented, { on } from '@ember/object/evented';
import Mixin, { mixin } from '@ember/object/mixin';
import Observable from '@ember/object/observable';
import { addObserver, removeObserver } from '@ember/object/observers';
import ObjectProxy from '@ember/object/proxy';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import { assign } from '@ember/polyfills';
import AutoLocation from '@ember/routing/auto-location';
import HashLocation from '@ember/routing/hash-location';
import HistoryLocation from '@ember/routing/history-location';
import NoneLocation from '@ember/routing/none-location';
import EmberLocation from '@ember/routing/location';
import Route from '@ember/routing/route';
import Router from '@ember/routing/router';
import {
  controllerFor,
  generateController,
  generateControllerFactory,
  DSL as RouterDSL,
} from '@ember/routing/-internals';
import { isNone, isBlank, isEmpty, isPresent, isEqual, typeOf, compare } from '@ember/utils';

import * as glimmerRuntime from '@glimmer/runtime';

import {
  helperCapabilities,
  setModifierManager,
  setComponentTemplate,
  getComponentTemplate,
  setHelperManager,
} from '@glimmer/manager';

import {
  assertDestroyablesDestroyed,
  associateDestroyableChild,
  destroy,
  enableDestroyableTracking,
  isDestroying,
  isDestroyed,
  registerDestructor,
  unregisterDestructor,
} from '@ember/destroyable';

import type * as EmberTemplateCompiler from 'ember-template-compiler';
import type { precompile, compile } from 'ember-template-compiler';
import type * as EmberTesting from 'ember-testing';

/**
  Namespace for injection helper methods.

  @class inject
  @namespace Ember
  @static
  @public
*/
function inject() {
  assert(
    `Injected properties must be created through helpers, see '${Object.keys(inject)
      .map((k) => `'inject.${k}'`)
      .join(' or ')}'`
  );
}
// ****@ember/controller****
inject.controller = injectController;
// ****@ember/service****
inject.service = service;

const PartialEmber = {
  isNamespace: true,

  toString() {
    return 'Ember';
  },

  // ****@ember/-internals/container****
  Container,
  Registry,

  // ****@ember/-internals/glimmer****
  // Partially re-exported from @glimmer/manager
  _setComponentManager: setComponentManager,
  _componentManagerCapabilities: componentCapabilities,
  _modifierManagerCapabilities: modifierCapabilities,

  // ****@ember/-internals/meta****
  meta,

  // ****@ember/-internals/metal****
  _createCache: metal.createCache, // Also @glimmer/validator
  _cacheGetValue: metal.getValue, // Also @glimmer/validator
  _cacheIsConst: metal.isConst, // Also @glimmer/validator
  _descriptor: metal.nativeDescDecorator,
  _getPath: metal._getPath,
  _setClassicDecorator: metal.setClassicDecorator,
  _tracked: metal.tracked, // Also exported from @glimmer/tracking
  beginPropertyChanges: metal.beginPropertyChanges,
  changeProperties: metal.changeProperties,
  endPropertyChanges: metal.endPropertyChanges,
  hasListeners: metal.hasListeners,
  libraries: metal.libraries,

  // ****@ember/-internals/runtime****
  _ContainerProxyMixin: ContainerProxyMixin,
  _ProxyMixin,
  _RegistryProxyMixin: RegistryProxyMixin,
  ActionHandler,
  Comparable,
  RSVP, // Also from 'rsvp' directly.

  // ****@ember/-internals/view****
  ComponentLookup: views.ComponentLookup,
  EventDispatcher: views.EventDispatcher,

  // ****@ember/-internals/utils****
  _Cache: utils.Cache,
  GUID_KEY: utils.GUID_KEY,
  canInvoke: utils.canInvoke,
  generateGuid: utils.generateGuid,
  guidFor: utils.guidFor,
  uuid: utils.uuid,
  wrap: utils.wrap,

  // ****@ember/application****
  getOwner,
  onLoad,
  runLoadHooks,
  setOwner,
  Application,

  // ****@ember/application/instance****
  ApplicationInstance,

  // ****@ember/application/namespace****
  Namespace,

  // ****@ember/array****
  A,
  Array: EmberArray,
  NativeArray,
  isArray,
  makeArray,

  // ****@ember/array/mutable****
  MutableArray,

  // ****@ember/array/proxy****
  ArrayProxy,

  // ****@ember/canary-features****
  FEATURES: { isEnabled, ...FEATURES },

  // ****@ember/component****
  _Input: Input,
  Component,

  // ****@ember/component/helper****
  Helper,

  // ****@ember/controller****
  Controller,
  ControllerMixin,

  // ****@ember/debug****
  _captureRenderTree: captureRenderTree,
  assert: EmberDebug.assert,
  warn: EmberDebug.warn,
  debug: EmberDebug.debug,
  deprecate: EmberDebug.deprecate,
  deprecateFunc: EmberDebug.deprecateFunc,
  runInDebug: EmberDebug.runInDebug,
  inspect: EmberDebug.inspect,

  Debug: {
    registerDeprecationHandler: EmberDebug.registerDeprecationHandler,
    registerWarnHandler: EmberDebug.registerWarnHandler,
    // ****@ember/-internals/metal****
    isComputed: metal.isComputed,
  },

  // ****@ember/debug/container-debug-adapter****
  ContainerDebugAdapter,

  // ****@ember/debug/data-adapter****
  DataAdapter,

  // ****@ember/destroyable****
  _assertDestroyablesDestroyed: assertDestroyablesDestroyed,
  _associateDestroyableChild: associateDestroyableChild,
  _enableDestroyableTracking: enableDestroyableTracking,
  _isDestroying: isDestroying,
  _isDestroyed: isDestroyed,
  _registerDestructor: registerDestructor,
  _unregisterDestructor: unregisterDestructor,
  destroy,

  // ****@ember/engine****
  Engine,

  // ****@ember/engine/instance****
  EngineInstance,

  // ****@ember/enumerable****
  Enumerable,

  // ****@ember/enumerable/mutable****
  MutableEnumerable,

  // ****@ember/instrumentation****
  instrument: instrumentation.instrument,
  subscribe: instrumentation.subscribe,

  Instrumentation: {
    instrument: instrumentation.instrument,
    subscribe: instrumentation.subscribe,
    unsubscribe: instrumentation.unsubscribe,
    reset: instrumentation.reset,
  },

  // ****@ember/object****
  Object: EmberObject,
  _action: action,
  computed,
  defineProperty,
  get,
  getProperties,
  notifyPropertyChange,
  observer,
  set,
  trySet,
  setProperties,

  // ****@ember/object/-internals****
  cacheFor,

  // ****@ember/object/compat****
  _dependentKeyCompat: dependentKeyCompat,

  // ****@ember/object/computed****
  ComputedProperty,
  expandProperties,

  // ****@ember/object/core****
  CoreObject,

  // ****@ember/object/evented****
  Evented,
  on,

  // ****@ember/object/events****
  addListener,
  removeListener,
  sendEvent,

  // ****@ember/object/mixin****
  Mixin,
  mixin,

  // ****@ember/object/observable****
  Observable,

  // ****@ember/object/observers****
  addObserver,
  removeObserver,

  // ****@ember/object/promise-proxy-mixin****
  PromiseProxyMixin,

  // ****@ember/object/proxy****
  ObjectProxy,

  // ****@ember/polyfills****
  assign,

  // ****@ember/routing/-internals****
  RouterDSL,
  controllerFor,
  generateController,
  generateControllerFactory,

  // ****@ember/routing/auto-location****
  AutoLocation,

  // ****@ember/routing/hash-location****
  HashLocation,

  // ****@ember/routing/history-location****
  HistoryLocation,

  // ****@ember/routing/location****
  Location: EmberLocation,

  // ****@ember/routing/none-location****
  NoneLocation,

  // ****@ember/routing/route****
  Route,

  // ****@ember/routing/router****
  Router,

  // ****@ember/runloop****
  run,

  // ****@ember/service****
  Service,

  // ****@ember/string****
  String: {
    camelize,
    capitalize,
    classify,
    decamelize,
    dasherize,
    underscore,
    w,
  },

  // ****@ember/utils****
  compare,
  isBlank,
  isEmpty,
  isEqual,
  isNone,
  isPresent,
  typeOf,

  // ****@ember/version****
  /**
    The semantic version

    @property VERSION
    @type String
    @public
  */
  VERSION,

  ViewUtils: {
    // ****@ember/-internals/views****
    getChildViews: views.getChildViews,
    getElementView: views.getElementView,
    getRootViews: views.getRootViews,
    getViewBounds: views.getViewBounds,
    getViewBoundingClientRect: views.getViewBoundingClientRect,
    getViewClientRects: views.getViewClientRects,
    getViewElement: views.getViewElement,
    isSimpleClick: views.isSimpleClick,

    // ****@ember/-internals/glimmer****
    isSerializationFirstNode,
  },

  // ****@glimmer/manager****
  _getComponentTemplate: getComponentTemplate,
  _helperManagerCapabilities: helperCapabilities,
  _setComponentTemplate: setComponentTemplate,
  _setHelperManager: setHelperManager,
  _setModifierManager: setModifierManager,

  // ****@glimmer/runtime****
  _templateOnlyComponent: glimmerRuntime.templateOnlyComponent,
  _invokeHelper: glimmerRuntime.invokeHelper,
  _hash: glimmerRuntime.hash,
  _array: glimmerRuntime.array,
  _concat: glimmerRuntime.concat,
  _get: glimmerRuntime.get,
  _on: glimmerRuntime.on,
  _fn: glimmerRuntime.fn,

  // Backburner
  _Backburner: Backburner,

  // ****@ember/controller, @ember/service****
  inject,

  // Non-imported
  platform: {
    defineProperty: true,
    hasPropertyAccessors: true,
  },

  __loader: {
    require,
    define,
    // @ts-expect-error These properties don't appear as being defined
    registry: typeof requirejs !== 'undefined' ? requirejs.entries : require.entries,
  },
} as const;

interface EmberHandlebars {
  template: typeof template;
  Utils: {
    escapeExpression: typeof escapeExpression;
  };
  compile?: typeof compile;
  precompile?: typeof precompile;
}

interface EmberHTMLBars {
  template: typeof template;
  compile?: typeof compile;
  precompile?: typeof precompile;
}

type PartialEmber = typeof PartialEmber;
interface Ember extends PartialEmber {
  get ENV(): object;

  // ****@ember/-internals/environment****
  get lookup(): Record<string, unknown>;
  set lookup(value: Record<string, unknown>);

  /**
    A function may be assigned to `Ember.onerror` to be called when Ember
    internals encounter an error. This is useful for specialized error handling
    and reporting code.

    ```javascript

    Ember.onerror = function(error) {
      const payload = {
        stack: error.stack,
        otherInformation: 'whatever app state you want to provide'
      };

      fetch('/report-error', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    };
    ```

    Internally, `Ember.onerror` is used as Backburner's error handler.

    @event onerror
    @for Ember
    @param {Exception} error the error object
    @public
  */
  // ****@ember/-internals/error-handling****
  get onerror(): Function | undefined;
  set onerror(handler: Function | undefined);

  get testing(): boolean;
  set testing(value: boolean);

  /**
    Defines the hash of localized strings for the current language. Used by
    the `String.loc` helper. To localize, add string values to this
    hash.

    @property STRINGS
    @for Ember
    @type Object
    @private
  */
  // ****@ember/string****
  get STRINGS(): {
    [key: string]: string;
  };
  set STRINGS(value: { [key: string]: string });

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
  get BOOTED(): boolean;
  set BOOTED(flag: boolean);

  /**
    Global hash of shared templates. This will automatically be populated
    by the build tools so that you can store your Handlebars templates in
    separate files that get loaded into JavaScript at buildtime.

    @property TEMPLATES
    @for Ember
    @type Object
    @private
  */
  get TEMPLATES(): TemplatesRegistry;
  set TEMPLATES(registry: TemplatesRegistry);

  HTMLBars: EmberHTMLBars;
  Handlebars: EmberHandlebars;
  Test?: typeof EmberTesting['Test'] & {
    Adapter: typeof EmberTesting['Adapter'];
    QUnitAdapter: typeof EmberTesting['QUnitAdapter'];
  };
  setupForTesting?: typeof EmberTesting['setupForTesting'];
}
const Ember = PartialEmber as Ember;

Object.defineProperty(Ember, 'ENV', {
  get: getENV,
  enumerable: false,
});

Object.defineProperty(Ember, 'lookup', {
  get: getLookup,
  set: setLookup,
  enumerable: false,
});

Object.defineProperty(Ember, 'onerror', {
  get: getOnerror,
  set: setOnerror,
  enumerable: false,
});

Object.defineProperty(Ember, 'testing', {
  get: EmberDebug.isTesting,
  set: EmberDebug.setTesting,
  enumerable: false,
});

Object.defineProperty(Ember, 'STRINGS', {
  configurable: false,
  get: _getStrings,
  set: _setStrings,
});

Object.defineProperty(Ember, 'BOOTED', {
  configurable: false,
  enumerable: false,
  get: metal.isNamespaceSearchDisabled,
  set: metal.setNamespaceSearchDisabled,
});

Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false,
});

function deprecateStringUseOnEmberModule() {
  deprecate(
    'Using `Ember.String` is deprecated. Please import methods directly from `@ember/string`.',
    false,
    {
      id: 'ember-string.from-ember-module',
      for: 'ember-source',
      since: {
        available: '4.10',
        enabled: '4.10.',
      },
      until: '5.0.0',
      url: 'https://deprecations.emberjs.com/v4.x/#toc_ember-string-from-ember-module',
    }
  );
}

Object.defineProperty(Ember, 'String', {
  enumerable: true,
  configurable: true,
  get() {
    deprecateStringUseOnEmberModule();

    return {
      camelize,
      capitalize,
      classify,
      dasherize,
      decamelize,
      underscore,
      w,
      htmlSafe,
      isHTMLSafe,
    };
  },
});

Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false,
});

// ****@ember/debug****
Object.defineProperty(Ember, 'testing', {
  get: EmberDebug.isTesting,
  set: EmberDebug.setTesting,
  enumerable: false,
});

runLoadHooks('Ember.Application', Application);

let EmberHandlebars: EmberHandlebars = {
  template,
  Utils: {
    escapeExpression,
  },
};

let EmberHTMLBars: EmberHTMLBars = {
  template,
};

function defineEmberTemplateCompilerLazyLoad(key: 'HTMLBars' | 'Handlebars') {
  Object.defineProperty(Ember, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (has('ember-template-compiler')) {
        let templateCompiler = require('ember-template-compiler') as typeof EmberTemplateCompiler;

        EmberHTMLBars.precompile = EmberHandlebars.precompile = templateCompiler.precompile;
        EmberHTMLBars.compile = EmberHandlebars.compile = templateCompiler.compile;

        Object.defineProperty(Ember, 'HTMLBars', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: EmberHTMLBars,
        });
        Object.defineProperty(Ember, 'Handlebars', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: EmberHandlebars,
        });
      }

      return key === 'Handlebars' ? EmberHandlebars : EmberHTMLBars;
    },
  });
}

defineEmberTemplateCompilerLazyLoad('HTMLBars');
defineEmberTemplateCompilerLazyLoad('Handlebars');

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
function defineEmberTestingLazyLoad(key: 'Test' | 'setupForTesting') {
  Object.defineProperty(Ember, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (has('ember-testing')) {
        let testing = require('ember-testing') as typeof EmberTesting;

        let { Test, Adapter, QUnitAdapter, setupForTesting } = testing;
        // @ts-expect-error We should not do this
        Test.Adapter = Adapter;
        // @ts-expect-error We should not do this
        Test.QUnitAdapter = QUnitAdapter;

        Object.defineProperty(Ember, 'Test', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: Test,
        });
        Object.defineProperty(Ember, 'setupForTesting', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: setupForTesting,
        });

        return key === 'Test' ? Test : setupForTesting;
      }

      return undefined;
    },
  });
}

defineEmberTestingLazyLoad('Test');
defineEmberTestingLazyLoad('setupForTesting');

// @ts-expect-error Per types, runLoadHooks requires a second parameter. Should we loosen types?
runLoadHooks('Ember');

export default Ember;
