/**
@module ember
*/
import { getENV, getLookup, setLookup } from '@ember/-internals/environment';
import * as utils from '@ember/-internals/utils';
import { Registry as InternalRegistry, Container as InternalContainer } from '@ember/-internals/container';
import * as instrumentation from '@ember/instrumentation';
import { meta as internalMeta } from '@ember/-internals/meta';
import * as metal from '@ember/-internals/metal';
import { FEATURES as EmberFEATURES, isEnabled } from '@ember/canary-features';
import * as EmberDebug from '@ember/debug';
import { assert as emberAssert, captureRenderTree } from '@ember/debug';
import Backburner from 'backburner.js';
import EmberController, { inject as injectController, ControllerMixin as EmberControllerMixin } from '@ember/controller';
import EmberService, { service } from '@ember/service';
import EmberObject, { action, computed as emberComputed, defineProperty as emberDefineProperty, notifyPropertyChange as emberNotifyPropertyChange, observer as emberObserver, get as emberGet, getProperties as emberGetProperties, set as emberSet, setProperties as emberSetProperties, trySet as emberTrySet } from '@ember/object';
import { cacheFor as emberCacheFor } from '@ember/object/-internals';
import { dependentKeyCompat } from '@ember/object/compat';
import EmberComputedProperty, { expandProperties as emberExpandProperties } from '@ember/object/computed';
import { addListener as emberAddListener, removeListener as emberRemoveListener, sendEvent as emberSendEvent } from '@ember/object/events';
import { RegistryProxyMixin, ContainerProxyMixin, _ProxyMixin as internalProxyMixin, RSVP as _RSVP, Comparable as InternalComparable, ActionHandler as InternalActionHandler } from '@ember/-internals/runtime';
import { componentCapabilities, modifierCapabilities, setComponentManager, escapeExpression, getTemplates, setTemplates, template, isSerializationFirstNode } from '@ember/-internals/glimmer';
import Version from './version';
import * as views from '@ember/-internals/views';
import EmberContainerDebugAdapter from '@ember/debug/container-debug-adapter';
import EmberDataAdapter from '@ember/debug/data-adapter';
import { run as emberRun } from '@ember/runloop';
import { getOnerror, setOnerror } from '@ember/-internals/error-handling';
import EmberArray, { A as EmberA, NativeArray as EmberNativeArray, isArray as emberIsArray, makeArray as emberMakeArray } from '@ember/array';
import EmberMutableArray from '@ember/array/mutable';
import EmberArrayProxy from '@ember/array/proxy';
import EmberApplication, { getOwner as applicationGetOwner, setOwner as applicationSetOwner, onLoad as applicationOnLoad, runLoadHooks as applicationRunLoadHooks } from '@ember/application';
import EmberApplicationInstance from '@ember/application/instance';
import EmberNamespace from '@ember/application/namespace';
import EmberComponent, { Input as EmberInput } from '@ember/component';
import EmberHelper from '@ember/component/helper';
import EmberEngine from '@ember/engine';
import EmberEngineInstance from '@ember/engine/instance';
import EmberEnumerable from '@ember/enumerable';
import EmberMutableEnumerable from '@ember/enumerable/mutable';
import EmberCoreObject from '@ember/object/core';
import EmberEvented, { on as emberOn } from '@ember/object/evented';
import EmberMixin, { mixin as emberMixin } from '@ember/object/mixin';
import EmberObservable from '@ember/object/observable';
import { addObserver as emberAddObserver, removeObserver as emberRemoveObserver } from '@ember/object/observers';
import EmberObjectProxy from '@ember/object/proxy';
import EmberPromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import EmberHashLocation from '@ember/routing/hash-location';
import EmberHistoryLocation from '@ember/routing/history-location';
import EmberNoneLocation from '@ember/routing/none-location';
import EmberRoute from '@ember/routing/route';
import EmberRouter from '@ember/routing/router';
import { controllerFor as emberControllerFor, generateController as emberGenerateController, generateControllerFactory as emberGenerateControllerFactory, DSL as EmberRouterDSL } from '@ember/routing/-internals';
import { isNone as emberIsNone, isBlank as emberIsBlank, isEmpty as emberIsEmpty, isPresent as emberIsPresent, isEqual as emberIsEqual, typeOf as emberTypeOf, compare as emberCompare } from '@ember/utils';
import * as glimmerRuntime from '@glimmer/runtime';
import { helperCapabilities, setModifierManager, setComponentTemplate, getComponentTemplate, setHelperManager } from '@glimmer/manager';
import { assertDestroyablesDestroyed, associateDestroyableChild, destroy as emberDestroy, enableDestroyableTracking, isDestroying, isDestroyed, registerDestructor, unregisterDestructor } from '@ember/destroyable';
import { _impl as EmberTestingImpl } from '@ember/test';
import * as templateCompilation from '@ember/template-compilation';
// eslint-disable-next-line @typescript-eslint/no-namespace
var Ember;
(function (Ember) {
  Ember.isNamespace = true;
  function toString() {
    return 'Ember';
  }
  Ember.toString = toString;
  // ****@ember/-internals/container****
  Ember.Container = InternalContainer;
  Ember.Registry = InternalRegistry;
  // ****@ember/-internals/glimmer****
  // Partially re-exported from @glimmer/manager
  Ember._setComponentManager = setComponentManager;
  Ember._componentManagerCapabilities = componentCapabilities;
  Ember._modifierManagerCapabilities = modifierCapabilities;
  // ****@ember/-internals/meta****
  Ember.meta = internalMeta;
  // ****@ember/-internals/metal****
  Ember._createCache = metal.createCache; // Also @glimmer/validator
  Ember._cacheGetValue = metal.getValue; // Also @glimmer/validator
  Ember._cacheIsConst = metal.isConst; // Also @glimmer/validator
  Ember._descriptor = metal.nativeDescDecorator;
  Ember._getPath = metal._getPath;
  Ember._setClassicDecorator = metal.setClassicDecorator;
  Ember._tracked = metal.tracked; // Also exported from @glimmer/tracking
  Ember.beginPropertyChanges = metal.beginPropertyChanges;
  Ember.changeProperties = metal.changeProperties;
  Ember.endPropertyChanges = metal.endPropertyChanges;
  Ember.hasListeners = metal.hasListeners;
  Ember.libraries = metal.libraries;
  // ****@ember/-internals/runtime****
  Ember._ContainerProxyMixin = ContainerProxyMixin;
  Ember._ProxyMixin = internalProxyMixin;
  Ember._RegistryProxyMixin = RegistryProxyMixin;
  Ember.ActionHandler = InternalActionHandler;
  Ember.Comparable = InternalComparable;
  // This syntax is namespace-specific: `import` in a namespace is aliasing one
  // namespace to another, while `export` marks the item public on the namespace
  // (as with the rest of the exported items).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Ember.RSVP = _RSVP;
  // ****@ember/-internals/view****
  Ember.ComponentLookup = views.ComponentLookup;
  Ember.EventDispatcher = views.EventDispatcher;
  // ****@ember/-internals/utils****
  Ember._Cache = utils.Cache;
  Ember.GUID_KEY = utils.GUID_KEY;
  Ember.canInvoke = utils.canInvoke;
  Ember.generateGuid = utils.generateGuid;
  Ember.guidFor = utils.guidFor;
  Ember.uuid = utils.uuid;
  Ember.wrap = utils.wrap;
  // ****@ember/application****
  Ember.getOwner = applicationGetOwner;
  Ember.onLoad = applicationOnLoad;
  Ember.runLoadHooks = applicationRunLoadHooks;
  Ember.setOwner = applicationSetOwner;
  Ember.Application = EmberApplication;
  // ****@ember/application/instance****
  Ember.ApplicationInstance = EmberApplicationInstance;
  // // ****@ember/application/namespace****
  Ember.Namespace = EmberNamespace;
  // ****@ember/array****
  Ember.A = EmberA;
  Ember.Array = EmberArray;
  Ember.NativeArray = EmberNativeArray;
  Ember.isArray = emberIsArray;
  Ember.makeArray = emberMakeArray;
  // ****@ember/array/mutable****
  Ember.MutableArray = EmberMutableArray;
  // ****@ember/array/proxy****
  Ember.ArrayProxy = EmberArrayProxy;
  // ****@ember/canary-features****
  Ember.FEATURES = {
    isEnabled,
    ...EmberFEATURES
  };
  // ****@ember/component****
  Ember._Input = EmberInput;
  Ember.Component = EmberComponent;
  // // ****@ember/component/helper****
  Ember.Helper = EmberHelper;
  // ****@ember/controller****
  Ember.Controller = EmberController;
  Ember.ControllerMixin = EmberControllerMixin;
  // ****@ember/debug****
  Ember._captureRenderTree = captureRenderTree;
  Ember.assert = EmberDebug.assert;
  Ember.warn = EmberDebug.warn;
  Ember.debug = EmberDebug.debug;
  Ember.deprecate = EmberDebug.deprecate;
  Ember.deprecateFunc = EmberDebug.deprecateFunc;
  Ember.runInDebug = EmberDebug.runInDebug;
  Ember.inspect = EmberDebug.inspect;
  Ember.Debug = {
    registerDeprecationHandler: EmberDebug.registerDeprecationHandler,
    registerWarnHandler: EmberDebug.registerWarnHandler,
    // ****@ember/-internals/metal****
    isComputed: metal.isComputed
  };
  // ****@ember/debug/container-debug-adapter****
  Ember.ContainerDebugAdapter = EmberContainerDebugAdapter;
  // ****@ember/debug/data-adapter****
  Ember.DataAdapter = EmberDataAdapter;
  // ****@ember/destroyable****
  Ember._assertDestroyablesDestroyed = assertDestroyablesDestroyed;
  Ember._associateDestroyableChild = associateDestroyableChild;
  Ember._enableDestroyableTracking = enableDestroyableTracking;
  Ember._isDestroying = isDestroying;
  Ember._isDestroyed = isDestroyed;
  Ember._registerDestructor = registerDestructor;
  Ember._unregisterDestructor = unregisterDestructor;
  Ember.destroy = emberDestroy;
  // ****@ember/engine****
  Ember.Engine = EmberEngine;
  // ****@ember/engine/instance****
  Ember.EngineInstance = EmberEngineInstance;
  // ****@ember/enumerable****
  Ember.Enumerable = EmberEnumerable;
  // ****@ember/enumerable/mutable****
  Ember.MutableEnumerable = EmberMutableEnumerable;
  // ****@ember/instrumentation****
  /** @private */
  Ember.instrument = instrumentation.instrument;
  /** @private */
  Ember.subscribe = instrumentation.subscribe;
  /** @private */
  Ember.Instrumentation = {
    instrument: instrumentation.instrument,
    subscribe: instrumentation.subscribe,
    unsubscribe: instrumentation.unsubscribe,
    reset: instrumentation.reset
  };
  // ****@ember/object****
  Ember.Object = EmberObject;
  Ember._action = action;
  Ember.computed = emberComputed;
  Ember.defineProperty = emberDefineProperty;
  Ember.get = emberGet;
  Ember.getProperties = emberGetProperties;
  Ember.notifyPropertyChange = emberNotifyPropertyChange;
  Ember.observer = emberObserver;
  Ember.set = emberSet;
  Ember.trySet = emberTrySet;
  Ember.setProperties = emberSetProperties;
  // ****@ember/object/-internals****
  Ember.cacheFor = emberCacheFor;
  // ****@ember/object/compat****
  Ember._dependentKeyCompat = dependentKeyCompat;
  // ****@ember/object/computed****
  Ember.ComputedProperty = EmberComputedProperty;
  Ember.expandProperties = emberExpandProperties;
  // ****@ember/object/core****
  Ember.CoreObject = EmberCoreObject;
  // ****@ember/object/evented****
  Ember.Evented = EmberEvented;
  Ember.on = emberOn;
  // ****@ember/object/events****
  Ember.addListener = emberAddListener;
  Ember.removeListener = emberRemoveListener;
  Ember.sendEvent = emberSendEvent;
  // ****@ember/object/mixin****
  Ember.Mixin = EmberMixin;
  Ember.mixin = emberMixin;
  // ****@ember/object/observable****
  Ember.Observable = EmberObservable;
  // ****@ember/object/observers****
  Ember.addObserver = emberAddObserver;
  Ember.removeObserver = emberRemoveObserver;
  // ****@ember/object/promise-proxy-mixin****
  Ember.PromiseProxyMixin = EmberPromiseProxyMixin;
  // ****@ember/object/proxy****
  Ember.ObjectProxy = EmberObjectProxy;
  // ****@ember/routing/-internals****
  Ember.RouterDSL = EmberRouterDSL;
  Ember.controllerFor = emberControllerFor;
  Ember.generateController = emberGenerateController;
  Ember.generateControllerFactory = emberGenerateControllerFactory;
  // ****@ember/routing/hash-location****
  Ember.HashLocation = EmberHashLocation;
  // ****@ember/routing/history-location****
  Ember.HistoryLocation = EmberHistoryLocation;
  // ****@ember/routing/none-location****
  Ember.NoneLocation = EmberNoneLocation;
  // ****@ember/routing/route****
  Ember.Route = EmberRoute;
  // ****@ember/routing/router****
  Ember.Router = EmberRouter;
  // // ****@ember/runloop****
  Ember.run = emberRun;
  // // ****@ember/service****
  Ember.Service = EmberService;
  // ****@ember/utils****
  Ember.compare = emberCompare;
  Ember.isBlank = emberIsBlank;
  Ember.isEmpty = emberIsEmpty;
  Ember.isEqual = emberIsEqual;
  Ember.isNone = emberIsNone;
  Ember.isPresent = emberIsPresent;
  Ember.typeOf = emberTypeOf;
  // ****@ember/version****
  /**
    The semantic version
       @property VERSION
    @type String
    @public
  */
  Ember.VERSION = Version;
  Ember.ViewUtils = {
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
    isSerializationFirstNode
  };
  // ****@glimmer/manager****
  Ember._getComponentTemplate = getComponentTemplate;
  Ember._helperManagerCapabilities = helperCapabilities;
  Ember._setComponentTemplate = setComponentTemplate;
  Ember._setHelperManager = setHelperManager;
  Ember._setModifierManager = setModifierManager;
  // ****@glimmer/runtime****
  Ember._templateOnlyComponent = glimmerRuntime.templateOnlyComponent;
  Ember._invokeHelper = glimmerRuntime.invokeHelper;
  Ember._hash = glimmerRuntime.hash;
  Ember._array = glimmerRuntime.array;
  Ember._concat = glimmerRuntime.concat;
  Ember._get = glimmerRuntime.get;
  Ember._on = glimmerRuntime.on;
  Ember._fn = glimmerRuntime.fn;
  // Backburner
  Ember._Backburner = Backburner;
  // // ****@ember/controller, @ember/service****
  /**
    Namespace for injection helper methods.
       @class inject
    @namespace Ember
    @static
    @public
  */
  function inject() {
    // uses `globalThis` to avoid clobbering with `Ember.Object` in TS namespace
    emberAssert(`Injected properties must be created through helpers, see '${globalThis.Object.keys(inject).map(k => `'inject.${k}'`).join(' or ')}'`);
  }
  Ember.inject = inject;
  // ****@ember/controller****
  inject.controller = injectController;
  // ****@ember/service****
  inject.service = service;
  Ember.__loader = {
    get require() {
      return globalThis.require;
    },
    get define() {
      return globalThis.define;
    },
    // @ts-expect-error These properties don't appear as being defined
    registry: typeof requirejs !== 'undefined' ? requirejs.entries : require.entries
  };
})(Ember || (Ember = {}));
Object.defineProperty(Ember, 'ENV', {
  get: getENV,
  enumerable: false
});
Object.defineProperty(Ember, 'lookup', {
  get: getLookup,
  set: setLookup,
  enumerable: false
});
Object.defineProperty(Ember, 'onerror', {
  get: getOnerror,
  set: setOnerror,
  enumerable: false
});
Object.defineProperty(Ember, 'testing', {
  get: EmberDebug.isTesting,
  set: EmberDebug.setTesting,
  enumerable: false
});
Object.defineProperty(Ember, 'BOOTED', {
  configurable: false,
  enumerable: false,
  get: metal.isNamespaceSearchDisabled,
  set: metal.setNamespaceSearchDisabled
});
Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false
});
Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false
});
// ****@ember/debug****
Object.defineProperty(Ember, 'testing', {
  get: EmberDebug.isTesting,
  set: EmberDebug.setTesting,
  enumerable: false
});
applicationRunLoadHooks('Ember.Application', EmberApplication);
let EmberHandlebars = {
  template,
  Utils: {
    escapeExpression
  }
};
let EmberHTMLBars = {
  template
};
function defineEmberTemplateCompilerLazyLoad(key) {
  Object.defineProperty(Ember, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (templateCompilation.__emberTemplateCompiler) {
        EmberHTMLBars.precompile = EmberHandlebars.precompile = templateCompilation.__emberTemplateCompiler.precompile;
        EmberHTMLBars.compile = EmberHandlebars.compile = templateCompilation.compileTemplate;
        Object.defineProperty(Ember, 'HTMLBars', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: EmberHTMLBars
        });
        Object.defineProperty(Ember, 'Handlebars', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: EmberHandlebars
        });
      }
      return key === 'Handlebars' ? EmberHandlebars : EmberHTMLBars;
    }
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
      if (EmberTestingImpl) {
        let {
          Test,
          Adapter,
          QUnitAdapter,
          setupForTesting
        } = EmberTestingImpl;
        // @ts-expect-error We should not do this
        Test.Adapter = Adapter;
        // @ts-expect-error We should not do this
        Test.QUnitAdapter = QUnitAdapter;
        Object.defineProperty(Ember, 'Test', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: Test
        });
        Object.defineProperty(Ember, 'setupForTesting', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: setupForTesting
        });
        return key === 'Test' ? Test : setupForTesting;
      }
      return undefined;
    }
  });
}
defineEmberTestingLazyLoad('Test');
defineEmberTestingLazyLoad('setupForTesting');
// @ts-expect-error Per types, runLoadHooks requires a second parameter. Should we loosen types?
applicationRunLoadHooks('Ember');
export default Ember;