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

import EmberObject, { action, computed, observer } from '@ember/object';
import { dependentKeyCompat } from '@ember/object/compat';

import {
  RegistryProxyMixin,
  ContainerProxyMixin,
  _ProxyMixin,
  RSVP,
  Comparable,
  ActionHandler,
} from '@ember/-internals/runtime';
import {
  Component,
  componentCapabilities,
  modifierCapabilities,
  setComponentManager,
  escapeExpression,
  getTemplates,
  Helper,
  helper,
  htmlSafe,
  isHTMLSafe,
  setTemplates,
  template,
  Input,
  isSerializationFirstNode,
} from '@ember/-internals/glimmer';
import VERSION from './version';
import * as views from '@ember/-internals/views';
import ContainerDebugAdapter from '@ember/debug/container-debug-adapter';
import DataAdapter from '@ember/debug/data-adapter';
import EmberError from '@ember/error';
import { run } from '@ember/runloop';
import { getOnerror, setOnerror } from '@ember/-internals/error-handling';
import { getOwner, setOwner } from '@ember/-internals/owner';
import EmberArray, { A, NativeArray, isArray } from '@ember/array';
import MutableArray from '@ember/array/mutable';
import ArrayProxy from '@ember/array/proxy';
import Application, { onLoad, runLoadHooks } from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import Namespace from '@ember/application/namespace';
import Engine from '@ember/engine';
import EngineInstance from '@ember/engine/instance';
import Enumerable from '@ember/enumerable';
import MutableEnumerable from '@ember/enumerable/mutable';
import CoreObject from '@ember/object/core';
import Evented from '@ember/object/evented';
import Mixin, { mixin } from '@ember/object/mixin';
import Observable from '@ember/object/observable';
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

import {
  templateOnlyComponent,
  invokeHelper,
  hash,
  array,
  concat,
  get,
  on,
  fn,
} from '@glimmer/runtime';

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

// ****@ember/-internals/environment****

const Ember = {};

Ember.isNamespace = true;
Ember.toString = function () {
  return 'Ember';
};

Object.defineProperty(Ember, 'ENV', {
  get: getENV,
  enumerable: false,
});

Object.defineProperty(Ember, 'lookup', {
  get: getLookup,
  set: setLookup,
  enumerable: false,
});

// ****@ember/application****
Ember.getOwner = getOwner;
Ember.setOwner = setOwner;
Ember.Application = Application;
Ember.ApplicationInstance = ApplicationInstance;

// ****@ember/engine****
Ember.Engine = Engine;
Ember.EngineInstance = EngineInstance;

// ****@ember/polyfills****
Ember.assign = assign;

// ****@ember/-internals/utils****
Ember.generateGuid = utils.generateGuid;
Ember.GUID_KEY = utils.GUID_KEY;
Ember.guidFor = utils.guidFor;
Ember.inspect = utils.inspect;
Ember.makeArray = utils.makeArray;
Ember.canInvoke = utils.canInvoke;
Ember.wrap = utils.wrap;
Ember.uuid = utils.uuid;

// ****@ember/-internals/container****
Ember.Container = Container;
Ember.Registry = Registry;

// ****@ember/debug****
Ember.assert = EmberDebug.assert;
Ember.warn = EmberDebug.warn;
Ember.debug = EmberDebug.debug;
Ember.deprecate = EmberDebug.deprecate;
Ember.deprecateFunc = EmberDebug.deprecateFunc;
Ember.runInDebug = EmberDebug.runInDebug;

// ****@ember/error****
Ember.Error = EmberError;

/**
  @public
  @class Ember.Debug
*/
Ember.Debug = {
  registerDeprecationHandler: EmberDebug.registerDeprecationHandler,
  registerWarnHandler: EmberDebug.registerWarnHandler,
  isComputed: metal.isComputed,
};

// ****@ember/instrumentation****
Ember.instrument = instrumentation.instrument;
Ember.subscribe = instrumentation.subscribe;
Ember.Instrumentation = {
  instrument: instrumentation.instrument,
  subscribe: instrumentation.subscribe,
  unsubscribe: instrumentation.unsubscribe,
  reset: instrumentation.reset,
};

// ****@ember/runloop****

Ember.run = run;

// ****@ember/-internals/metal****

// in globals builds
Ember.computed = computed;
Ember._descriptor = metal.nativeDescDecorator;
Ember._tracked = metal.tracked;
Ember.cacheFor = metal.getCachedValueFor;
Ember.ComputedProperty = metal.ComputedProperty;
Ember._setClassicDecorator = metal.setClassicDecorator;
Ember.meta = meta;
Ember.get = metal.get;
Ember._getPath = metal._getPath;
Ember.set = metal.set;
Ember.trySet = metal.trySet;
Ember.FEATURES = Object.assign({ isEnabled }, FEATURES);
Ember._Cache = utils.Cache;
Ember.on = metal.on;
Ember.addListener = metal.addListener;
Ember.removeListener = metal.removeListener;
Ember.sendEvent = metal.sendEvent;
Ember.hasListeners = metal.hasListeners;
Ember.isNone = isNone;
Ember.isEmpty = isEmpty;
Ember.isBlank = isBlank;
Ember.isPresent = isPresent;
Ember.notifyPropertyChange = metal.notifyPropertyChange;
Ember.beginPropertyChanges = metal.beginPropertyChanges;
Ember.endPropertyChanges = metal.endPropertyChanges;
Ember.changeProperties = metal.changeProperties;
Ember.platform = {
  defineProperty: true,
  hasPropertyAccessors: true,
};
Ember.defineProperty = metal.defineProperty;
Ember.destroy = destroy;
Ember.libraries = metal.libraries;
Ember.getProperties = metal.getProperties;
Ember.setProperties = metal.setProperties;
Ember.expandProperties = metal.expandProperties;
Ember.addObserver = metal.addObserver;
Ember.removeObserver = metal.removeObserver;
Ember.observer = observer;
Ember.mixin = mixin;
Ember.Mixin = Mixin;

Ember._createCache = metal.createCache;
Ember._cacheGetValue = metal.getValue;
Ember._cacheIsConst = metal.isConst;

Ember._registerDestructor = registerDestructor;
Ember._unregisterDestructor = unregisterDestructor;
Ember._associateDestroyableChild = associateDestroyableChild;
Ember._assertDestroyablesDestroyed = assertDestroyablesDestroyed;
Ember._enableDestroyableTracking = enableDestroyableTracking;
Ember._isDestroying = isDestroying;
Ember._isDestroyed = isDestroyed;

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

Ember._Backburner = Backburner;

// ****@ember/-internals/runtime****
Ember.A = A;
Ember.String = {
  w,
  dasherize,
  decamelize,
  camelize,
  classify,
  underscore,
  capitalize,
};
Ember.Object = EmberObject;
Ember._RegistryProxyMixin = RegistryProxyMixin;
Ember._ContainerProxyMixin = ContainerProxyMixin;
Ember.compare = compare;
Ember.isEqual = isEqual;

/**
@module ember
*/

/**
  Namespace for injection helper methods.

  @class inject
  @namespace Ember
  @static
  @public
*/
Ember.inject = function inject() {
  assert(
    `Injected properties must be created through helpers, see '${Object.keys(inject)
      .map((k) => `'inject.${k}'`)
      .join(' or ')}'`
  );
};
Ember.inject.service = service;
Ember.inject.controller = injectController;

Ember.Array = EmberArray;
Ember.Comparable = Comparable;
Ember.Enumerable = Enumerable;
Ember.ArrayProxy = ArrayProxy;
Ember.ObjectProxy = ObjectProxy;
Ember.ActionHandler = ActionHandler;
Ember.CoreObject = CoreObject;
Ember.NativeArray = NativeArray;
Ember.MutableEnumerable = MutableEnumerable;
Ember.MutableArray = MutableArray;
Ember.Evented = Evented;
Ember.PromiseProxyMixin = PromiseProxyMixin;
Ember.Observable = Observable;
Ember.typeOf = typeOf;
Ember.isArray = isArray;
Ember.Object = EmberObject;
Ember.onLoad = onLoad;
Ember.runLoadHooks = runLoadHooks;
Ember.Controller = Controller;
Ember.ControllerMixin = ControllerMixin;
Ember.Service = Service;
Ember._ProxyMixin = _ProxyMixin;
Ember.RSVP = RSVP;
Ember.Namespace = Namespace;

Ember._action = action;
Ember._dependentKeyCompat = dependentKeyCompat;

/**
  Defines the hash of localized strings for the current language. Used by
  the `String.loc` helper. To localize, add string values to this
  hash.

  @property STRINGS
  @for Ember
  @type Object
  @private
*/
Object.defineProperty(Ember, 'STRINGS', {
  configurable: false,
  get: _getStrings,
  set: _setStrings,
});

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
Object.defineProperty(Ember, 'BOOTED', {
  configurable: false,
  enumerable: false,
  get: metal.isNamespaceSearchDisabled,
  set: metal.setNamespaceSearchDisabled,
});

// ****@ember/-internals/glimmer****
Ember.Component = Component;
Helper.helper = helper;
Ember.Helper = Helper;
Ember._setComponentManager = setComponentManager;
Ember._componentManagerCapabilities = componentCapabilities;
Ember._setModifierManager = setModifierManager;
Ember._modifierManagerCapabilities = modifierCapabilities;

Ember._getComponentTemplate = getComponentTemplate;
Ember._setComponentTemplate = setComponentTemplate;
Ember._templateOnlyComponent = templateOnlyComponent;

Ember._Input = Input;
Ember._hash = hash;
Ember._array = array;
Ember._concat = concat;
Ember._get = get;
Ember._on = on;
Ember._fn = fn;

Ember._helperManagerCapabilities = helperCapabilities;
Ember._setHelperManager = setHelperManager;
Ember._invokeHelper = invokeHelper;
Ember._captureRenderTree = captureRenderTree;

const deprecateImportFromString = function (
  name,
  message = `Importing ${name} from '@ember/string' is deprecated. Please import ${name} from '@ember/template' instead.`
) {
  // Disabling this deprecation due to unintended errors in 3.25
  // See https://github.com/emberjs/ember.js/issues/19393 fo more information.
  deprecate(message, true, {
    id: 'ember-string.htmlsafe-ishtmlsafe',
    for: 'ember-source',
    since: {
      available: '3.25',
      enabled: '3.25',
    },
    until: '4.0.0',
    url: 'https://deprecations.emberjs.com/v3.x/#toc_ember-string-htmlsafe-ishtmlsafe',
  });
};
Object.defineProperty(Ember.String, 'htmlSafe', {
  enumerable: true,
  configurable: true,
  get() {
    deprecateImportFromString('htmlSafe');
    return htmlSafe;
  },
});
Object.defineProperty(Ember.String, 'isHTMLSafe', {
  enumerable: true,
  configurable: true,
  get() {
    deprecateImportFromString('isHTMLSafe');
    return isHTMLSafe;
  },
});

/**
  Global hash of shared templates. This will automatically be populated
  by the build tools so that you can store your Handlebars templates in
  separate files that get loaded into JavaScript at buildtime.

  @property TEMPLATES
  @for Ember
  @type Object
  @private
*/
Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false,
});

/**
  The semantic version

  @property VERSION
  @type String
  @public
*/
Ember.VERSION = VERSION;

Ember.ViewUtils = {
  isSimpleClick: views.isSimpleClick,
  getElementView: views.getElementView,
  getViewElement: views.getViewElement,
  getViewBounds: views.getViewBounds,
  getViewClientRects: views.getViewClientRects,
  getViewBoundingClientRect: views.getViewBoundingClientRect,
  getRootViews: views.getRootViews,
  getChildViews: views.getChildViews,
  isSerializationFirstNode: isSerializationFirstNode,
};
Ember.ComponentLookup = views.ComponentLookup;
Ember.EventDispatcher = views.EventDispatcher;

Ember.Location = EmberLocation;
Ember.AutoLocation = AutoLocation;
Ember.HashLocation = HashLocation;
Ember.HistoryLocation = HistoryLocation;
Ember.NoneLocation = NoneLocation;
Ember.controllerFor = controllerFor;
Ember.generateControllerFactory = generateControllerFactory;
Ember.generateController = generateController;
Ember.RouterDSL = RouterDSL;
Ember.Router = Router;
Ember.Route = Route;

runLoadHooks('Ember.Application', Application);

Ember.DataAdapter = DataAdapter;
Ember.ContainerDebugAdapter = ContainerDebugAdapter;

let EmberHandlebars = {
  template,
  Utils: {
    escapeExpression,
  },
};

let EmberHTMLBars = {
  template,
};

function defineEmberTemplateCompilerLazyLoad(key) {
  Object.defineProperty(Ember, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (has('ember-template-compiler')) {
        let templateCompiler = require('ember-template-compiler');

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
function defineEmberTestingLazyLoad(key) {
  Object.defineProperty(Ember, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (has('ember-testing')) {
        let testing = require('ember-testing');

        let { Test, Adapter, QUnitAdapter, setupForTesting } = testing;
        Test.Adapter = Adapter;
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

runLoadHooks('Ember');

Ember.__loader = {
  require,
  // eslint-disable-next-line no-undef
  define,
  // eslint-disable-next-line no-undef
  registry: typeof requirejs !== 'undefined' ? requirejs.entries : require.entries,
};

export default Ember;
