declare module 'ember' {
  /**
    @module ember
    */
  import * as utils from '@ember/-internals/utils';
  import {
    Registry as InternalRegistry,
    Container as InternalContainer,
  } from '@ember/-internals/container';
  import * as instrumentation from '@ember/instrumentation';
  import * as metal from '@ember/-internals/metal';
  import { isEnabled } from '@ember/canary-features';
  import * as EmberDebug from '@ember/debug';
  import Backburner from 'backburner.js';
  import EmberController, {
    inject as injectController,
    ControllerMixin as EmberControllerMixin,
  } from '@ember/controller';
  import EmberService from '@ember/service';
  import EmberObject, { action, observer as emberObserver } from '@ember/object';
  import { dependentKeyCompat } from '@ember/object/compat';
  import EmberComputedProperty from '@ember/object/computed';
  import {
    RSVP as _RSVP,
    Comparable as InternalComparable,
    ActionHandler as InternalActionHandler,
  } from '@ember/-internals/runtime';
  import {
    setComponentManager,
    escapeExpression,
    template,
    isSerializationFirstNode,
    type TemplatesRegistry,
  } from '@ember/-internals/glimmer';
  import * as views from '@ember/-internals/views';
  import EmberContainerDebugAdapter from '@ember/debug/container-debug-adapter';
  import EmberDataAdapter from '@ember/debug/data-adapter';
  import { run as emberRun } from '@ember/runloop';
  import EmberArray, {
    NativeArray as EmberNativeArray,
    isArray as emberIsArray,
    makeArray as emberMakeArray,
  } from '@ember/array';
  import EmberMutableArray from '@ember/array/mutable';
  import EmberArrayProxy from '@ember/array/proxy';
  import EmberApplication, {
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
  import EmberEvented from '@ember/object/evented';
  import EmberMixin, { mixin as emberMixin } from '@ember/object/mixin';
  import EmberObservable from '@ember/object/observable';
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
    associateDestroyableChild,
    registerDestructor,
    unregisterDestructor,
  } from '@ember/destroyable';
  import type { precompile, compile } from 'ember-template-compiler';
  import { _impl as EmberTestingImpl } from '@ember/test';
  namespace Ember {
    const isNamespace = true;
    function toString(): string;
    const Container: typeof InternalContainer;
    type Container = InternalContainer;
    const Registry: typeof InternalRegistry;
    type Registry = InternalRegistry;
    const _setComponentManager: typeof setComponentManager;
    const _componentManagerCapabilities: typeof import('@glimmer/manager').componentCapabilities;
    const _modifierManagerCapabilities: typeof import('@glimmer/manager').modifierCapabilities;
    const meta: {
      (obj: object): import('@ember/-internals/meta').Meta;
      _counters?: import('@ember/-internals/meta').MetaCounters | undefined;
    };
    const _createCache: typeof metal.createCache;
    const _cacheGetValue: typeof metal.getValue;
    const _cacheIsConst: typeof metal.isConst;
    const _descriptor: typeof metal.nativeDescDecorator;
    const _getPath: typeof metal._getPath;
    const _setClassicDecorator: typeof metal.setClassicDecorator;
    const _tracked: typeof metal.tracked;
    const beginPropertyChanges: typeof metal.beginPropertyChanges;
    const changeProperties: typeof metal.changeProperties;
    const endPropertyChanges: typeof metal.endPropertyChanges;
    const hasListeners: typeof metal.hasListeners;
    const libraries: metal.Libraries;
    const _ContainerProxyMixin: EmberMixin;
    const _ProxyMixin: EmberMixin;
    const _RegistryProxyMixin: EmberMixin;
    const ActionHandler: EmberMixin;
    type ActionHandler = InternalActionHandler;
    const Comparable: EmberMixin;
    type Comparable = InternalComparable;
    export import RSVP = _RSVP;
    const ComponentLookup: Readonly<typeof EmberObject> &
      (new (owner?: import('@ember/owner').default | undefined) => EmberObject) & {
        componentFor(
          name: string,
          owner: import('@ember/-internals/owner').InternalOwner
        ): import('@ember/owner').FactoryManager<object> | undefined;
        layoutFor(
          name: string,
          owner: import('@ember/-internals/owner').InternalOwner,
          options: import('@ember/owner').RegisterOptions
        ): unknown;
      };
    const EventDispatcher: typeof views.EventDispatcher;
    const _Cache: typeof utils.Cache;
    const GUID_KEY: `__ember${number}`;
    const canInvoke: typeof utils.canInvoke;
    const generateGuid: typeof utils.generateGuid;
    const guidFor: typeof utils.guidFor;
    const uuid: typeof utils.uuid;
    const wrap: typeof utils.wrap;
    const getOwner: (object: object) => import('@ember/owner').default | undefined;
    const onLoad: typeof applicationOnLoad;
    const runLoadHooks: typeof applicationRunLoadHooks;
    const setOwner: typeof import('@ember/owner').setOwner;
    const Application: typeof EmberApplication;
    type Application = EmberApplication;
    const ApplicationInstance: typeof EmberApplicationInstance;
    type ApplicationInstance = EmberApplicationInstance;
    const Namespace: typeof EmberNamespace;
    type Namespace = EmberNamespace;
    const A: <T>(arr?: T[] | undefined) => EmberNativeArray<T>;
    const Array: EmberMixin;
    type Array<T> = EmberArray<T>;
    const NativeArray: EmberMixin;
    type NativeArray<T> = EmberNativeArray<T>;
    const isArray: typeof emberIsArray;
    const makeArray: typeof emberMakeArray;
    const MutableArray: EmberMixin;
    type MutableArray<T> = EmberMutableArray<T>;
    const ArrayProxy: typeof EmberArrayProxy;
    type ArrayProxy<T> = EmberArrayProxy<T>;
    const FEATURES: {
      isEnabled: typeof isEnabled;
    };
    const _Input: EmberInput;
    const Component: typeof EmberComponent;
    type Component<S = unknown> = EmberComponent<S>;
    const Helper: typeof EmberHelper;
    type Helper<S = unknown> = EmberHelper<S>;
    const Controller: typeof EmberController;
    type Controller<T = unknown> = EmberController<T>;
    const ControllerMixin: EmberMixin;
    type ControllerMixin<T> = EmberControllerMixin<T>;
    const _captureRenderTree: typeof EmberDebug.captureRenderTree;
    const assert: EmberDebug.AssertFunc;
    const warn: import('@ember/debug/lib/warn').WarnFunc;
    const debug: EmberDebug.DebugFunc;
    const deprecate: import('@ember/debug/lib/deprecate').DeprecateFunc;
    const deprecateFunc: EmberDebug.DeprecateFuncFunc;
    const runInDebug: EmberDebug.RunInDebugFunc;
    const inspect: typeof EmberDebug.inspect;
    const Debug: {
      registerDeprecationHandler: (
        handler: import('@ember/debug/lib/handlers').HandlerCallback<EmberDebug.DeprecationOptions>
      ) => void;
      registerWarnHandler: import('@ember/debug/lib/warn').RegisterHandlerFunc;
      isComputed: typeof metal.isComputed;
    };
    const ContainerDebugAdapter: typeof EmberContainerDebugAdapter;
    type ContainerDebugAdapter = EmberContainerDebugAdapter;
    const DataAdapter: typeof EmberDataAdapter;
    type DataAdapter<T> = EmberDataAdapter<T>;
    const _assertDestroyablesDestroyed: (() => void) | undefined;
    const _associateDestroyableChild: typeof associateDestroyableChild;
    const _enableDestroyableTracking: (() => void) | undefined;
    const _isDestroying: typeof glimmerRuntime.isDestroying;
    const _isDestroyed: typeof glimmerRuntime.isDestroyed;
    const _registerDestructor: typeof registerDestructor;
    const _unregisterDestructor: typeof unregisterDestructor;
    const destroy: typeof glimmerRuntime.destroy;
    const Engine: typeof EmberEngine;
    type Engine = EmberEngine;
    const EngineInstance: typeof EmberEngineInstance;
    type EngineInstance = EmberEngineInstance;
    const Enumerable: EmberMixin;
    type Enumerable = EmberEnumerable;
    const MutableEnumerable: EmberMixin;
    type MutableEnumerable = EmberMutableEnumerable;
    /** @private */
    const instrument: typeof instrumentation.instrument;
    /** @private */
    const subscribe: typeof instrumentation.subscribe;
    /** @private */
    const Instrumentation: {
      instrument: typeof instrumentation.instrument;
      subscribe: typeof instrumentation.subscribe;
      unsubscribe: typeof instrumentation.unsubscribe;
      reset: typeof instrumentation.reset;
    };
    const Object: typeof EmberObject;
    type Object = EmberObject;
    const _action: typeof action;
    const computed: typeof metal.computed;
    const defineProperty: typeof metal.defineProperty;
    const get: typeof metal.get;
    const getProperties: typeof metal.getProperties;
    const notifyPropertyChange: typeof metal.notifyPropertyChange;
    const observer: typeof emberObserver;
    const set: typeof metal.set;
    const trySet: typeof metal.trySet;
    const setProperties: typeof metal.setProperties;
    const cacheFor: typeof metal.getCachedValueFor;
    const _dependentKeyCompat: typeof dependentKeyCompat;
    const ComputedProperty: typeof metal.ComputedProperty;
    type ComputedProperty = EmberComputedProperty;
    const expandProperties: typeof metal.expandProperties;
    const CoreObject: typeof EmberCoreObject;
    type CoreObject = EmberCoreObject;
    const Evented: EmberMixin;
    type Evented = EmberEvented;
    const on: typeof metal.on;
    const addListener: typeof metal.addListener;
    const removeListener: typeof metal.removeListener;
    const sendEvent: typeof metal.sendEvent;
    const Mixin: typeof EmberMixin;
    type Mixin = EmberMixin;
    const mixin: typeof emberMixin;
    const Observable: EmberMixin;
    type Observable = EmberObservable;
    const addObserver: typeof metal.addObserver;
    const removeObserver: typeof metal.removeObserver;
    const PromiseProxyMixin: EmberMixin;
    type PromiseProxyMixin<T> = EmberPromiseProxyMixin<T>;
    const ObjectProxy: typeof EmberObjectProxy;
    type ObjectProxy = EmberObjectProxy;
    const RouterDSL: typeof EmberRouterDSL;
    type RouterDSL = EmberRouterDSL;
    const controllerFor: typeof emberControllerFor;
    const generateController: typeof emberGenerateController;
    const generateControllerFactory: typeof emberGenerateControllerFactory;
    const HashLocation: typeof EmberHashLocation;
    type HashLocation = EmberHashLocation;
    const HistoryLocation: typeof EmberHistoryLocation;
    type HistoryLocation = EmberHistoryLocation;
    const NoneLocation: typeof EmberNoneLocation;
    type NoneLocation = EmberNoneLocation;
    const Route: typeof EmberRoute;
    type Route = EmberRoute;
    const Router: typeof EmberRouter;
    type Router = EmberRouter;
    const run: typeof emberRun;
    const Service: typeof EmberService;
    type Service = EmberService;
    const compare: typeof emberCompare;
    const isBlank: typeof emberIsBlank;
    const isEmpty: typeof emberIsEmpty;
    const isEqual: typeof emberIsEqual;
    const isNone: typeof emberIsNone;
    const isPresent: typeof emberIsPresent;
    const typeOf: typeof emberTypeOf;
    /**
          The semantic version
      
          @property VERSION
          @type String
          @public
        */
    const VERSION: string;
    const ViewUtils: {
      getChildViews: typeof views.getChildViews;
      getElementView: typeof views.getElementView;
      getRootViews: typeof views.getRootViews;
      getViewBounds: typeof views.getViewBounds;
      getViewBoundingClientRect: typeof views.getViewBoundingClientRect;
      getViewClientRects: typeof views.getViewClientRects;
      getViewElement: typeof views.getViewElement;
      isSimpleClick: typeof views.isSimpleClick;
      isSerializationFirstNode: typeof isSerializationFirstNode;
    };
    const _getComponentTemplate: typeof getComponentTemplate;
    const _helperManagerCapabilities: typeof helperCapabilities;
    const _setComponentTemplate: typeof setComponentTemplate;
    const _setHelperManager: typeof setHelperManager;
    const _setModifierManager: typeof setModifierManager;
    const _templateOnlyComponent: typeof glimmerRuntime.templateOnlyComponent;
    const _invokeHelper: typeof glimmerRuntime.invokeHelper;
    const _hash: object;
    const _array: object;
    const _concat: object;
    const _get: object;
    const _on: {};
    const _fn: object;
    const _Backburner: typeof Backburner;
    type _Backburner = Backburner;
    /**
          Namespace for injection helper methods.
      
          @class inject
          @namespace Ember
          @static
          @public
        */
    function inject(): void;
    namespace inject {
      var controller: typeof injectController;
      var service: typeof import('@ember/service').service;
    }
    const __loader: {
      readonly require: any;
      readonly define: any;
      registry: any;
    };
    const ENV: Readonly<object>;
    let lookup: Record<string, unknown>;
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
    let onerror: ((error: Error) => unknown) | undefined;
    let testing: boolean;
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
    let BOOTED: boolean;
    /**
          Global hash of shared templates. This will automatically be populated
          by the build tools so that you can store your Handlebars templates in
          separate files that get loaded into JavaScript at buildtime.
      
          @property TEMPLATES
          @for Ember
          @type Object
          @private
        */
    let TEMPLATES: TemplatesRegistry;
    let HTMLBars: EmberHTMLBars;
    let Handlebars: EmberHandlebars;
    let Test:
      | (NonNullable<typeof EmberTestingImpl>['Test'] & {
          Adapter: NonNullable<typeof EmberTestingImpl>['Adapter'];
          QUnitAdapter: NonNullable<typeof EmberTestingImpl>['QUnitAdapter'];
        })
      | undefined;
    let setupForTesting: NonNullable<typeof EmberTestingImpl>['setupForTesting'] | undefined;
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
  let EmberHandlebars: EmberHandlebars;
  let EmberHTMLBars: EmberHTMLBars;
  export default Ember;
}
