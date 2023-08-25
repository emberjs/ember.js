/**
@module ember
*/

import require, { has } from 'require';

import { getENV, getLookup, setLookup } from '@ember/-internals/environment';
import * as utils from '@ember/-internals/utils';
import {
  Registry as InternalRegistry,
  Container as InternalContainer,
} from '@ember/-internals/container';
import * as instrumentation from '@ember/instrumentation';
import { meta as internalMeta } from '@ember/-internals/meta';
import * as metal from '@ember/-internals/metal';
import { FEATURES as EmberFEATURES, isEnabled } from '@ember/canary-features';
import * as EmberDebug from '@ember/debug';
import { assert as emberAssert, captureRenderTree } from '@ember/debug';
import Backburner from 'backburner.js';
import EmberController, {
  inject as injectController,
  ControllerMixin as EmberControllerMixin,
} from '@ember/controller';
import EmberService, { service } from '@ember/service';

import EmberObject, {
  action,
  computed as emberComputed,
  defineProperty as emberDefineProperty,
  notifyPropertyChange as emberNotifyPropertyChange,
  observer as emberObserver,
  get as emberGet,
  getProperties as emberGetProperties,
  set as emberSet,
  setProperties as emberSetProperties,
  trySet as emberTrySet,
} from '@ember/object';
import { cacheFor as emberCacheFor } from '@ember/object/-internals';
import { dependentKeyCompat } from '@ember/object/compat';
import EmberComputedProperty, {
  expandProperties as emberExpandProperties,
} from '@ember/object/computed';
import {
  addListener as emberAddListener,
  removeListener as emberRemoveListener,
  sendEvent as emberSendEvent,
} from '@ember/object/events';

// This is available in global scope courtesy of `loader/lib/index.js`, but that
// "module" is created as a runtime-only module and makes `define` available as
// a global as one of the side effects of executing the script. Since our type
// publishing infrastructure does not handle `declare global { }` blocks at this
// point, we "just" define it here, which is the only place it is actually used
// in Ember's own public or intimate APIs.
declare function define(path: string, deps: string[], module: () => void): void;

import {
  RegistryProxyMixin,
  ContainerProxyMixin,
  _ProxyMixin as internalProxyMixin,
  RSVP as _RSVP,
  Comparable as InternalComparable,
  ActionHandler as InternalActionHandler,
} from '@ember/-internals/runtime';
import {
  componentCapabilities,
  modifierCapabilities,
  setComponentManager,
  escapeExpression,
  getTemplates,
  setTemplates,
  template,
  isSerializationFirstNode,
  type TemplatesRegistry,
} from '@ember/-internals/glimmer';
import Version from './version';
import * as views from '@ember/-internals/views';
import EmberContainerDebugAdapter from '@ember/debug/container-debug-adapter';
import EmberDataAdapter from '@ember/debug/data-adapter';
import { run as emberRun } from '@ember/runloop';
import { getOnerror, setOnerror } from '@ember/-internals/error-handling';
import EmberArray, {
  A as EmberA,
  NativeArray as EmberNativeArray,
  isArray as emberIsArray,
  makeArray as emberMakeArray,
} from '@ember/array';
import EmberMutableArray from '@ember/array/mutable';
import EmberArrayProxy from '@ember/array/proxy';
import EmberApplication, {
  getOwner as applicationGetOwner,
  setOwner as applicationSetOwner,
  onLoad as applicationOnLoad,
  runLoadHooks as applicationRunLoadHooks,
} from '@ember/application';
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
import {
  addObserver as emberAddObserver,
  removeObserver as emberRemoveObserver,
} from '@ember/object/observers';
import EmberObjectProxy from '@ember/object/proxy';
import EmberPromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import EmberHashLocation from '@ember/routing/hash-location';
import EmberHistoryLocation from '@ember/routing/history-location';
import EmberNoneLocation from '@ember/routing/none-location';
import EmberRoute from '@ember/routing/route';
import EmberRouter from '@ember/routing/router';
import {
  controllerFor as emberControllerFor,
  generateController as emberGenerateController,
  generateControllerFactory as emberGenerateControllerFactory,
  DSL as EmberRouterDSL,
} from '@ember/routing/-internals';
import {
  isNone as emberIsNone,
  isBlank as emberIsBlank,
  isEmpty as emberIsEmpty,
  isPresent as emberIsPresent,
  isEqual as emberIsEqual,
  typeOf as emberTypeOf,
  compare as emberCompare,
} from '@ember/utils';

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
  destroy as emberDestroy,
  enableDestroyableTracking,
  isDestroying,
  isDestroyed,
  registerDestructor,
  unregisterDestructor,
} from '@ember/destroyable';

import type * as EmberTemplateCompiler from 'ember-template-compiler';
import type { precompile, compile } from 'ember-template-compiler';
import type * as EmberTesting from 'ember-testing';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Ember {
  export const isNamespace = true;

  export function toString() {
    return 'Ember';
  }

  // ****@ember/-internals/container****
  export const Container = InternalContainer;
  export type Container = InternalContainer;
  export const Registry = InternalRegistry;
  export type Registry = InternalRegistry;

  // ****@ember/-internals/glimmer****
  // Partially re-exported from @glimmer/manager
  export const _setComponentManager = setComponentManager;
  export const _componentManagerCapabilities = componentCapabilities;
  export const _modifierManagerCapabilities = modifierCapabilities;

  // ****@ember/-internals/meta****
  export const meta = internalMeta;

  // ****@ember/-internals/metal****
  export const _createCache = metal.createCache; // Also @glimmer/validator
  export const _cacheGetValue = metal.getValue; // Also @glimmer/validator
  export const _cacheIsConst = metal.isConst; // Also @glimmer/validator
  export const _descriptor = metal.nativeDescDecorator;
  export const _getPath = metal._getPath;
  export const _setClassicDecorator = metal.setClassicDecorator;
  export const _tracked = metal.tracked; // Also exported from @glimmer/tracking
  export const beginPropertyChanges = metal.beginPropertyChanges;
  export const changeProperties = metal.changeProperties;
  export const endPropertyChanges = metal.endPropertyChanges;
  export const hasListeners = metal.hasListeners;
  export const libraries = metal.libraries;

  // ****@ember/-internals/runtime****
  export const _ContainerProxyMixin = ContainerProxyMixin;
  export const _ProxyMixin = internalProxyMixin;
  export const _RegistryProxyMixin = RegistryProxyMixin;
  export const ActionHandler = InternalActionHandler;
  export type ActionHandler = InternalActionHandler;
  export const Comparable = InternalComparable;
  export type Comparable = InternalComparable;

  // This syntax is namespace-specific: `import` in a namespace is aliasing one
  // namespace to another, while `export` marks the item public on the namespace
  // (as with the rest of the exported items).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export import RSVP = _RSVP;

  // ****@ember/-internals/view****
  export const ComponentLookup = views.ComponentLookup;
  export const EventDispatcher = views.EventDispatcher;

  // ****@ember/-internals/utils****
  export const _Cache = utils.Cache;
  export const GUID_KEY = utils.GUID_KEY;
  export const canInvoke = utils.canInvoke;
  export const generateGuid = utils.generateGuid;
  export const guidFor = utils.guidFor;
  export const uuid = utils.uuid;
  export const wrap = utils.wrap;

  // ****@ember/application****
  export const getOwner = applicationGetOwner;
  export const onLoad = applicationOnLoad;
  export const runLoadHooks = applicationRunLoadHooks;
  export const setOwner = applicationSetOwner;
  export const Application = EmberApplication;
  export type Application = EmberApplication;

  // ****@ember/application/instance****
  export const ApplicationInstance = EmberApplicationInstance;
  export type ApplicationInstance = EmberApplicationInstance;

  // // ****@ember/application/namespace****
  export const Namespace = EmberNamespace;
  export type Namespace = EmberNamespace;

  // ****@ember/array****
  export const A = EmberA;
  export const Array = EmberArray;
  export type Array<T> = EmberArray<T>;
  export const NativeArray = EmberNativeArray;
  export type NativeArray<T> = EmberNativeArray<T>;
  export const isArray = emberIsArray;
  export const makeArray = emberMakeArray;

  // ****@ember/array/mutable****
  export const MutableArray = EmberMutableArray;
  export type MutableArray<T> = EmberMutableArray<T>;

  // ****@ember/array/proxy****
  export const ArrayProxy = EmberArrayProxy;
  export type ArrayProxy<T> = EmberArrayProxy<T>;

  // ****@ember/canary-features****
  export const FEATURES = { isEnabled, ...EmberFEATURES };

  // ****@ember/component****
  export const _Input = EmberInput;
  export const Component = EmberComponent;
  export type Component<S = unknown> = EmberComponent<S>;

  // // ****@ember/component/helper****
  export const Helper = EmberHelper;
  export type Helper<S = unknown> = EmberHelper<S>;

  // ****@ember/controller****
  export const Controller = EmberController;
  export type Controller<T = unknown> = EmberController<T>;
  export const ControllerMixin = EmberControllerMixin;
  export type ControllerMixin<T> = EmberControllerMixin<T>;

  // ****@ember/debug****
  export const _captureRenderTree = captureRenderTree;
  export const assert = EmberDebug.assert;
  export const warn = EmberDebug.warn;
  export const debug = EmberDebug.debug;
  export const deprecate = EmberDebug.deprecate;
  export const deprecateFunc = EmberDebug.deprecateFunc;
  export const runInDebug = EmberDebug.runInDebug;
  export const inspect = EmberDebug.inspect;

  export const Debug = {
    registerDeprecationHandler: EmberDebug.registerDeprecationHandler,
    registerWarnHandler: EmberDebug.registerWarnHandler,
    // ****@ember/-internals/metal****
    isComputed: metal.isComputed,
  };

  // ****@ember/debug/container-debug-adapter****
  export const ContainerDebugAdapter = EmberContainerDebugAdapter;
  export type ContainerDebugAdapter = EmberContainerDebugAdapter;

  // ****@ember/debug/data-adapter****
  export const DataAdapter = EmberDataAdapter;
  export type DataAdapter<T> = EmberDataAdapter<T>;

  // ****@ember/destroyable****
  export const _assertDestroyablesDestroyed = assertDestroyablesDestroyed;
  export const _associateDestroyableChild = associateDestroyableChild;
  export const _enableDestroyableTracking = enableDestroyableTracking;
  export const _isDestroying = isDestroying;
  export const _isDestroyed = isDestroyed;
  export const _registerDestructor = registerDestructor;
  export const _unregisterDestructor = unregisterDestructor;
  export const destroy = emberDestroy;

  // ****@ember/engine****
  export const Engine = EmberEngine;
  export type Engine = EmberEngine;

  // ****@ember/engine/instance****
  export const EngineInstance = EmberEngineInstance;
  export type EngineInstance = EmberEngineInstance;

  // ****@ember/enumerable****
  export const Enumerable = EmberEnumerable;
  export type Enumerable = EmberEnumerable;

  // ****@ember/enumerable/mutable****
  export const MutableEnumerable = EmberMutableEnumerable;
  export type MutableEnumerable = EmberMutableEnumerable;

  // ****@ember/instrumentation****
  /** @private */
  export const instrument = instrumentation.instrument;
  /** @private */
  export const subscribe = instrumentation.subscribe;

  /** @private */
  export const Instrumentation = {
    instrument: instrumentation.instrument,
    subscribe: instrumentation.subscribe,
    unsubscribe: instrumentation.unsubscribe,
    reset: instrumentation.reset,
  };

  // ****@ember/object****
  export const Object = EmberObject;
  export type Object = EmberObject;
  export const _action = action;
  export const computed = emberComputed;
  export const defineProperty = emberDefineProperty;
  export const get = emberGet;
  export const getProperties = emberGetProperties;
  export const notifyPropertyChange = emberNotifyPropertyChange;
  export const observer = emberObserver;
  export const set = emberSet;
  export const trySet = emberTrySet;
  export const setProperties = emberSetProperties;

  // ****@ember/object/-internals****
  export const cacheFor = emberCacheFor;

  // ****@ember/object/compat****
  export const _dependentKeyCompat = dependentKeyCompat;

  // ****@ember/object/computed****
  export const ComputedProperty = EmberComputedProperty;
  export type ComputedProperty = EmberComputedProperty;
  export const expandProperties = emberExpandProperties;

  // ****@ember/object/core****
  export const CoreObject = EmberCoreObject;
  export type CoreObject = EmberCoreObject;

  // ****@ember/object/evented****
  export const Evented = EmberEvented;
  export type Evented = EmberEvented;
  export const on = emberOn;

  // ****@ember/object/events****
  export const addListener = emberAddListener;
  export const removeListener = emberRemoveListener;
  export const sendEvent = emberSendEvent;

  // ****@ember/object/mixin****
  export const Mixin = EmberMixin;
  export type Mixin = EmberMixin;
  export const mixin = emberMixin;

  // ****@ember/object/observable****
  export const Observable = EmberObservable;
  export type Observable = EmberObservable;

  // ****@ember/object/observers****
  export const addObserver = emberAddObserver;
  export const removeObserver = emberRemoveObserver;

  // ****@ember/object/promise-proxy-mixin****
  export const PromiseProxyMixin = EmberPromiseProxyMixin;
  export type PromiseProxyMixin<T> = EmberPromiseProxyMixin<T>;

  // ****@ember/object/proxy****
  export const ObjectProxy = EmberObjectProxy;
  export type ObjectProxy = EmberObjectProxy;

  // ****@ember/routing/-internals****
  export const RouterDSL = EmberRouterDSL;
  export type RouterDSL = EmberRouterDSL;
  export const controllerFor = emberControllerFor;
  export const generateController = emberGenerateController;
  export const generateControllerFactory = emberGenerateControllerFactory;

  // ****@ember/routing/hash-location****
  export const HashLocation = EmberHashLocation;
  export type HashLocation = EmberHashLocation;

  // ****@ember/routing/history-location****
  export const HistoryLocation = EmberHistoryLocation;
  export type HistoryLocation = EmberHistoryLocation;

  // ****@ember/routing/none-location****
  export const NoneLocation = EmberNoneLocation;
  export type NoneLocation = EmberNoneLocation;

  // ****@ember/routing/route****
  export const Route = EmberRoute;
  export type Route = EmberRoute;

  // ****@ember/routing/router****
  export const Router = EmberRouter;
  export type Router = EmberRouter;

  // // ****@ember/runloop****
  export const run = emberRun;

  // // ****@ember/service****
  export const Service = EmberService;
  export type Service = EmberService;

  // ****@ember/utils****
  export const compare = emberCompare;
  export const isBlank = emberIsBlank;
  export const isEmpty = emberIsEmpty;
  export const isEqual = emberIsEqual;
  export const isNone = emberIsNone;
  export const isPresent = emberIsPresent;
  export const typeOf = emberTypeOf;

  // ****@ember/version****
  /**
    The semantic version

    @property VERSION
    @type String
    @public
  */
  export const VERSION = Version;

  export const ViewUtils = {
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
  };

  // ****@glimmer/manager****
  export const _getComponentTemplate = getComponentTemplate;
  export const _helperManagerCapabilities = helperCapabilities;
  export const _setComponentTemplate = setComponentTemplate;
  export const _setHelperManager = setHelperManager;
  export const _setModifierManager = setModifierManager;

  // ****@glimmer/runtime****
  export const _templateOnlyComponent = glimmerRuntime.templateOnlyComponent;
  export const _invokeHelper = glimmerRuntime.invokeHelper;
  export const _hash = glimmerRuntime.hash;
  export const _array = glimmerRuntime.array;
  export const _concat = glimmerRuntime.concat;
  export const _get = glimmerRuntime.get;
  export const _on = glimmerRuntime.on;
  export const _fn = glimmerRuntime.fn;

  // Backburner
  export const _Backburner = Backburner;
  export type _Backburner = Backburner;

  // // ****@ember/controller, @ember/service****
  /**
    Namespace for injection helper methods.

    @class inject
    @namespace Ember
    @static
    @public
  */
  export function inject() {
    // uses `globalThis` to avoid clobbering with `Ember.Object` in TS namespace
    emberAssert(
      `Injected properties must be created through helpers, see '${globalThis.Object.keys(inject)
        .map((k) => `'inject.${k}'`)
        .join(' or ')}'`
    );
  }
  // ****@ember/controller****
  inject.controller = injectController;
  // ****@ember/service****
  inject.service = service;

  export const __loader = {
    require,
    define,
    // @ts-expect-error These properties don't appear as being defined
    registry: typeof requirejs !== 'undefined' ? requirejs.entries : require.entries,
  };

  // ------------------------------------------------------------------------ //
  // These properties are assigned to the namespace with getters (and, in some
  // cases setters) with `Object.defineProperty` below.
  // ------------------------------------------------------------------------ //

  export declare const ENV: Readonly<object>;

  // ****@ember/-internals/environment****
  export declare let lookup: Record<string, unknown>;

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
    @param {Error} error the error object
    @public
  */
  // ****@ember/-internals/error-handling****
  export declare let onerror: ((error: Error) => unknown) | undefined;

  export declare let testing: boolean;

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
  export declare let BOOTED: boolean;

  /**
    Global hash of shared templates. This will automatically be populated
    by the build tools so that you can store your Handlebars templates in
    separate files that get loaded into JavaScript at buildtime.

    @property TEMPLATES
    @for Ember
    @type Object
    @private
  */
  export declare let TEMPLATES: TemplatesRegistry;

  export declare let HTMLBars: EmberHTMLBars;
  export declare let Handlebars: EmberHandlebars;
  export declare let Test:
    | ((typeof EmberTesting)['Test'] & {
        Adapter: (typeof EmberTesting)['Adapter'];
        QUnitAdapter: (typeof EmberTesting)['QUnitAdapter'];
      })
    | undefined;
  export declare let setupForTesting: (typeof EmberTesting)['setupForTesting'] | undefined;
}

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

applicationRunLoadHooks('Ember.Application', EmberApplication);

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
applicationRunLoadHooks('Ember');

export default Ember;
