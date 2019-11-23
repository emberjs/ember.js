import { computed, get, notifyPropertyChange, set } from '@ember/-internals/metal';
import { getOwner, Owner } from '@ember/-internals/owner';
import { A as emberA, Evented, Object as EmberObject, typeOf } from '@ember/-internals/runtime';
import { assert, deprecate, info } from '@ember/debug';
import { APP_CTRL_ROUTER_PROPS, ROUTER_EVENTS } from '@ember/deprecated-features';
import EmberError from '@ember/error';
import { assign } from '@ember/polyfills';
import { cancel, once, run, scheduleOnce } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import EmberLocation, { EmberLocation as IEmberLocation } from '../location/api';
import { calculateCacheKey, extractRouteArgs, getActiveTargetName, resemblesURL } from '../utils';
import DSL from './dsl';
import Route, {
  defaultSerialize,
  hasDefaultSerialize,
  RenderOptions,
  ROUTE_CONNECTIONS,
  ROUTER_EVENT_DEPRECATIONS,
} from './route';
import RouterState from './router_state';
/**
@module @ember/routing
*/

import { MatchCallback } from 'route-recognizer';
import Router, {
  InternalRouteInfo,
  logAbort,
  QUERY_PARAMS_SYMBOL,
  STATE_SYMBOL,
  Transition,
  TransitionError,
  TransitionState,
} from 'router_js';
import { EngineRouteInfo } from './engines';
import Controller from '@ember/controller';

function defaultDidTransition(this: EmberRouter, infos: PrivateRouteInfo[]) {
  updatePaths(this);

  this._cancelSlowTransitionTimer();

  this.notifyPropertyChange('url');
  this.set('currentState', this.targetState);

  // Put this in the runloop so url will be accurate. Seems
  // less surprising than didTransition being out of sync.
  once(this, this.trigger, 'didTransition');

  if (DEBUG) {
    if (get(this, 'namespace').LOG_TRANSITIONS) {
      // eslint-disable-next-line no-console
      console.log(`Transitioned into '${EmberRouter._routePath(infos)}'`);
    }
  }
}

function defaultWillTransition(
  this: EmberRouter,
  oldInfos: PrivateRouteInfo[],
  newInfos: PrivateRouteInfo[],
  transition: Transition
) {
  once(this, this.trigger, 'willTransition', transition);

  if (DEBUG) {
    if (get(this, 'namespace').LOG_TRANSITIONS) {
      // eslint-disable-next-line no-console
      console.log(
        `Preparing to transition from '${EmberRouter._routePath(
          oldInfos
        )}' to '${EmberRouter._routePath(newInfos)}'`
      );
    }
  }
}

interface RenderOutletState {
  name: string;
  outlet: string;
}

interface NestedOutletState {
  [key: string]: OutletState;
}

interface OutletState {
  render: RenderOutletState;
  outlets: NestedOutletState;
}

interface EngineInstance extends Owner {
  boot(): void;
  destroy(): void;
}

export interface QueryParam {
  prop: string;
  urlKey: string;
  type: string;
  route: Route;
  parts: string[];
  values: {};
  scopedPropertyName: string;
}

export type PrivateRouteInfo = InternalRouteInfo<Route>;

function K(this: Router<Route>) {
  return this;
}

const { slice } = Array.prototype;

/**
  The `EmberRouter` class manages the application state and URLs. Refer to
  the [routing guide](https://guides.emberjs.com/release/routing/) for documentation.

  @class EmberRouter
  @extends EmberObject
  @uses Evented
  @public
*/
class EmberRouter extends EmberObject {
  location!: string | IEmberLocation;
  rootURL!: string;
  _routerMicrolib!: Router<Route>;

  currentURL: string | null = null;
  currentRouteName: string | null = null;
  currentPath: string | null = null;
  currentRoute = null;

  _qpCache = Object.create(null);
  _qpUpdates = new Set();

  _handledErrors = new Set();
  _engineInstances: { [name: string]: { [id: string]: EngineInstance } } = Object.create(null);
  _engineInfoByRoute = Object.create(null);

  constructor() {
    super(...arguments);

    this._resetQueuedQueryParameterChanges();
  }

  _initRouterJs() {
    let location = get(this, 'location');
    let router = this;
    let owner = getOwner(this);
    let seen = Object.create(null);

    class PrivateRouter extends Router<Route> {
      getRoute(name: string): Route {
        let routeName = name;
        let routeOwner = owner;
        let engineInfo = router._engineInfoByRoute[routeName];

        if (engineInfo) {
          let engineInstance = router._getEngineInstance(engineInfo);

          routeOwner = engineInstance;
          routeName = engineInfo.localFullName;
        }

        let fullRouteName = `route:${routeName}`;

        let route = routeOwner.lookup<Route>(fullRouteName);

        if (seen[name]) {
          return route!;
        }

        seen[name] = true;

        if (!route) {
          let DefaultRoute: any = routeOwner.factoryFor('route:basic')!.class;
          routeOwner.register(fullRouteName, DefaultRoute.extend());
          route = routeOwner.lookup(fullRouteName);

          if (DEBUG) {
            if (get(router, 'namespace.LOG_ACTIVE_GENERATION')) {
              info(`generated -> ${fullRouteName}`, { fullName: fullRouteName });
            }
          }
        }

        route!._setRouteName(routeName);

        if (engineInfo && !hasDefaultSerialize(route!)) {
          throw new Error(
            'Defining a custom serialize method on an Engine route is not supported.'
          );
        }

        return route!;
      }

      getSerializer(name: string) {
        let engineInfo = router._engineInfoByRoute[name];

        // If this is not an Engine route, we fall back to the handler for serialization
        if (!engineInfo) {
          return;
        }

        return engineInfo.serializeMethod || defaultSerialize;
      }

      updateURL(path: string) {
        once(() => {
          location.setURL(path);
          set(router, 'currentURL', path);
        });
      }

      didTransition(infos: PrivateRouteInfo[]) {
        if (ROUTER_EVENTS) {
          if (router.didTransition !== defaultDidTransition) {
            deprecate(
              'You attempted to override the "didTransition" method which is deprecated. Please inject the router service and listen to the "routeDidChange" event.',
              false,
              {
                id: 'deprecate-router-events',
                until: '4.0.0',
                url: 'https://emberjs.com/deprecations/v3.x#toc_deprecate-router-events',
              }
            );
          }
        }
        router.didTransition(infos);
      }

      willTransition(
        oldInfos: PrivateRouteInfo[],
        newInfos: PrivateRouteInfo[],
        transition: Transition
      ) {
        if (ROUTER_EVENTS) {
          if (router.willTransition !== defaultWillTransition) {
            deprecate(
              'You attempted to override the "willTransition" method which is deprecated. Please inject the router service and listen to the "routeWillChange" event.',
              false,
              {
                id: 'deprecate-router-events',
                until: '4.0.0',
                url: 'https://emberjs.com/deprecations/v3.x#toc_deprecate-router-events',
              }
            );
          }
        }
        router.willTransition(oldInfos, newInfos, transition);
      }

      triggerEvent(
        routeInfos: PrivateRouteInfo[],
        ignoreFailure: boolean,
        name: string,
        args: unknown[]
      ) {
        return triggerEvent.bind(router)(routeInfos, ignoreFailure, name, args);
      }

      routeWillChange(transition: Transition) {
        router.trigger('routeWillChange', transition);
      }

      routeDidChange(transition: Transition) {
        router.set('currentRoute', transition.to);
        once(() => {
          router.trigger('routeDidChange', transition);
        });
      }

      transitionDidError(error: TransitionError, transition: Transition) {
        if (error.wasAborted || transition.isAborted) {
          // If the error was a transition erorr or the transition aborted
          // log the abort.
          return logAbort(transition);
        } else {
          // Otherwise trigger the "error" event to attempt an intermediate
          // transition into an error substate
          transition.trigger(false, 'error', error.error, transition, error.route);
          if (router._isErrorHandled(error.error)) {
            // If we handled the error with a substate just roll the state back on
            // the transition and send the "routeDidChange" event for landing on
            // the error substate and return the error.
            transition.rollback();
            this.routeDidChange(transition);
            return error.error;
          } else {
            // If it was not handled, abort the transition completely and return
            // the error.
            transition.abort();
            return error.error;
          }
        }
      }

      _triggerWillChangeContext() {
        return router;
      }

      _triggerWillLeave() {
        return router;
      }

      replaceURL(url: string) {
        if (location.replaceURL) {
          let doReplaceURL = () => {
            location.replaceURL(url);
            set(router, 'currentURL', url);
          };
          once(doReplaceURL);
        } else {
          this.updateURL(url);
        }
      }
    }

    let routerMicrolib = (this._routerMicrolib = new PrivateRouter());

    let dslCallbacks = (this.constructor as any).dslCallbacks || [K];
    let dsl = this._buildDSL();

    dsl.route(
      'application',
      { path: '/', resetNamespace: true, overrideNameAssertion: true },
      function() {
        for (let i = 0; i < dslCallbacks.length; i++) {
          dslCallbacks[i].call(this);
        }
      }
    );

    if (DEBUG) {
      if (get(this, 'namespace.LOG_TRANSITIONS_INTERNAL')) {
        routerMicrolib.log = console.log.bind(console); // eslint-disable-line no-console
      }
    }

    routerMicrolib.map(dsl.generate());
  }

  _buildDSL(): DSL {
    let enableLoadingSubstates = this._hasModuleBasedResolver();
    let router = this;
    let owner = getOwner(this);
    let options = {
      enableLoadingSubstates,
      resolveRouteMap(name: string) {
        return owner.factoryFor(`route-map:${name}`)!;
      },
      addRouteForEngine(name: string, engineInfo: EngineRouteInfo) {
        if (!router._engineInfoByRoute[name]) {
          router._engineInfoByRoute[name] = engineInfo;
        }
      },
    };

    return new DSL(null, options);
  }

  /*
    Resets all pending query parameter changes.
    Called after transitioning to a new route
    based on query parameter changes.
  */
  _resetQueuedQueryParameterChanges() {
    this._queuedQPChanges = {};
  }

  _hasModuleBasedResolver() {
    let owner = getOwner(this);
    if (!owner) {
      return false;
    }

    let resolver = get(owner, 'application.__registry__.resolver.moduleBasedResolver');
    return Boolean(resolver);
  }

  /**
    Initializes the current router instance and sets up the change handling
    event listeners used by the instances `location` implementation.

    A property named `initialURL` will be used to determine the initial URL.
    If no value is found `/` will be used.

    @method startRouting
    @private
  */
  startRouting() {
    let initialURL = get(this, 'initialURL');

    if (this.setupRouter()) {
      if (initialURL === undefined) {
        initialURL = get(this, 'location').getURL();
      }
      let initialTransition = this.handleURL(initialURL);
      if (initialTransition && initialTransition.error) {
        throw initialTransition.error;
      }
    }
  }

  setupRouter() {
    this._setupLocation();

    let location = get(this, 'location');

    // Allow the Location class to cancel the router setup while it refreshes
    // the page
    if (get(location, 'cancelRouterSetup')) {
      return false;
    }

    this._initRouterJs();

    location.onUpdateURL((url: string) => {
      this.handleURL(url);
    });

    return true;
  }

  _setOutlets() {
    // This is triggered async during Route#willDestroy.
    // If the router is also being destroyed we do not want to
    // to create another this._toplevelView (and leak the renderer)
    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    let routeInfos = this._routerMicrolib.currentRouteInfos;
    let route: Route | undefined;
    let defaultParentState: OutletState;
    let liveRoutes = null;

    if (!routeInfos) {
      return;
    }

    for (let i = 0; i < routeInfos.length; i++) {
      route = routeInfos[i].route;
      let connections = ROUTE_CONNECTIONS.get(route!);
      let ownState: OutletState;
      for (let j = 0; j < connections.length; j++) {
        let appended = appendLiveRoute(liveRoutes!, defaultParentState!, connections[j]);
        liveRoutes = appended.liveRoutes;
        if (
          appended.ownState.render.name === route!.routeName ||
          appended.ownState.render.outlet === 'main'
        ) {
          ownState = appended.ownState;
        }
      }
      if (connections.length === 0) {
        ownState = representEmptyRoute(liveRoutes!, defaultParentState! as OutletState, route!);
      }
      defaultParentState = ownState!;
    }

    // when a transitionTo happens after the validation phase
    // during the initial transition _setOutlets is called
    // when no routes are active. However, it will get called
    // again with the correct values during the next turn of
    // the runloop
    if (!liveRoutes) {
      return;
    }

    if (!this._toplevelView) {
      let owner = getOwner(this);
      let OutletView = owner.factoryFor('view:-outlet')!;
      this._toplevelView = OutletView.create();
      this._toplevelView.setOutletState(liveRoutes);
      let instance: any = owner.lookup('-application-instance:main');
      instance.didCreateRootView(this._toplevelView);
    } else {
      this._toplevelView.setOutletState(liveRoutes);
    }
  }

  handleURL(url: string) {
    // Until we have an ember-idiomatic way of accessing #hashes, we need to
    // remove it because router.js doesn't know how to handle it.
    let _url = url.split(/#(.+)?/)[0];
    return this._doURLTransition('handleURL', _url);
  }

  _doURLTransition(routerJsMethod: string, url: string) {
    let transition = this._routerMicrolib[routerJsMethod](url || '/');
    didBeginTransition(transition, this);
    return transition;
  }

  /**
    Transition the application into another route. The route may
    be either a single route or route path:

    See [transitionTo](/ember/release/classes/Route/methods/transitionTo?anchor=transitionTo) for more info.

    @method transitionTo
    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used while
      transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @return {Transition} the transition object associated with this
      attempted transition
    @public
  */
  transitionTo(...args: unknown[]) {
    if (resemblesURL(args[0] as string)) {
      assert(
        `A transition was attempted from '${this.currentRouteName}' to '${args[0]}' but the application instance has already been destroyed.`,
        !this.isDestroying && !this.isDestroyed
      );
      return this._doURLTransition('transitionTo', args[0] as string);
    }
    let { routeName, models, queryParams } = extractRouteArgs(args);
    assert(
      `A transition was attempted from '${this.currentRouteName}' to '${routeName}' but the application instance has already been destroyed.`,
      !this.isDestroying && !this.isDestroyed
    );
    return this._doTransition(routeName, models, queryParams);
  }

  intermediateTransitionTo(name: string, ...args: any[]) {
    this._routerMicrolib.intermediateTransitionTo(name, ...args);

    updatePaths(this);

    if (DEBUG) {
      let infos = this._routerMicrolib.currentRouteInfos;
      if (get(this, 'namespace').LOG_TRANSITIONS) {
        // eslint-disable-next-line no-console
        console.log(`Intermediate-transitioned into '${EmberRouter._routePath(infos)}'`);
      }
    }
  }

  replaceWith(...args: any[]) {
    return this.transitionTo(...args).method('replace');
  }

  generate(name: string, ...args: any[]) {
    let url = this._routerMicrolib.generate(name, ...args);
    return (this.location as IEmberLocation).formatURL(url);
  }

  /**
    Determines if the supplied route is currently active.

    @method isActive
    @param routeName
    @return {Boolean}
    @private
  */
  isActive(routeName: string) {
    return this._routerMicrolib.isActive(routeName);
  }

  /**
    An alternative form of `isActive` that doesn't require
    manual concatenation of the arguments into a single
    array.

    @method isActiveIntent
    @param routeName
    @param models
    @param queryParams
    @return {Boolean}
    @private
    @since 1.7.0
  */
  isActiveIntent(routeName: string, models: {}[], queryParams: QueryParam) {
    return this.currentState!.isActiveIntent(routeName, models, queryParams);
  }

  send(name: string, ...args: any[]) {
    /*name, context*/
    this._routerMicrolib.trigger(name, ...args);
  }

  /**
    Does this router instance have the given route.

    @method hasRoute
    @return {Boolean}
    @private
  */
  hasRoute(route: string) {
    return this._routerMicrolib.hasRoute(route);
  }

  /**
    Resets the state of the router by clearing the current route
    handlers and deactivating them.

    @private
    @method reset
   */
  reset() {
    if (this._routerMicrolib) {
      this._routerMicrolib.reset();
    }
  }

  willDestroy() {
    if (this._toplevelView) {
      this._toplevelView.destroy();
      this._toplevelView = null;
    }

    this._super(...arguments);

    this.reset();

    let instances = this._engineInstances;
    for (let name in instances) {
      for (let id in instances[name]) {
        run(instances[name][id], 'destroy');
      }
    }
  }

  /*
    Called when an active route's query parameter has changed.
    These changes are batched into a runloop run and trigger
    a single transition.
  */
  _activeQPChanged(queryParameterName: string, newValue: unknown) {
    this._queuedQPChanges[queryParameterName] = newValue;
    once(this, this._fireQueryParamTransition);
  }

  _updatingQPChanged(queryParameterName: string) {
    this._qpUpdates.add(queryParameterName);
  }

  /*
    Triggers a transition to a route based on query parameter changes.
    This is called once per runloop, to batch changes.

    e.g.

    if these methods are called in succession:
    this._activeQPChanged('foo', '10');
      // results in _queuedQPChanges = { foo: '10' }
    this._activeQPChanged('bar', false);
      // results in _queuedQPChanges = { foo: '10', bar: false }

    _queuedQPChanges will represent both of these changes
    and the transition using `transitionTo` will be triggered
    once.
  */
  _fireQueryParamTransition() {
    this.transitionTo({ queryParams: this._queuedQPChanges });
    this._resetQueuedQueryParameterChanges();
  }

  _setupLocation() {
    let location = this.location;
    let rootURL = this.rootURL;
    let owner = getOwner(this);

    if ('string' === typeof location && owner) {
      let resolvedLocation = owner.lookup(`location:${location}`);

      if (resolvedLocation !== undefined) {
        location = set(this, 'location', resolvedLocation);
      } else {
        // Allow for deprecated registration of custom location API's
        let options = {
          implementation: location,
        };

        location = set(this, 'location', EmberLocation.create(options));
      }
    }

    if (location !== null && typeof location === 'object') {
      if (rootURL) {
        set(location, 'rootURL', rootURL);
      }

      // Allow the location to do any feature detection, such as AutoLocation
      // detecting history support. This gives it a chance to set its
      // `cancelRouterSetup` property which aborts routing.
      if (typeof location.detect === 'function') {
        location.detect();
      }

      // ensure that initState is called AFTER the rootURL is set on
      // the location instance
      if (typeof location.initState === 'function') {
        location.initState();
      }
    }
  }

  /**
    Serializes the given query params according to their QP meta information.

    @private
    @method _serializeQueryParams
    @param {Arrray<RouteInfo>} routeInfos
    @param {Object} queryParams
    @return {Void}
  */
  _serializeQueryParams(routeInfos: PrivateRouteInfo[], queryParams: QueryParam) {
    forEachQueryParam(
      this,
      routeInfos,
      queryParams,
      (key: string, value: unknown, qp: QueryParam) => {
        if (qp) {
          delete queryParams[key];
          queryParams[qp.urlKey] = qp.route.serializeQueryParam(value, qp.urlKey, qp.type);
        } else if (value === undefined) {
          return; // We don't serialize undefined values
        } else {
          queryParams[key] = this._serializeQueryParam(value, typeOf(value));
        }
      }
    );
  }

  /**
    Serializes the value of a query parameter based on a type

    @private
    @method _serializeQueryParam
    @param {Object} value
    @param {String} type
  */
  _serializeQueryParam(value: unknown, type: string) {
    if (value === null || value === undefined) {
      return value;
    } else if (type === 'array') {
      return JSON.stringify(value);
    }

    return `${value}`;
  }

  /**
    Deserializes the given query params according to their QP meta information.

    @private
    @method _deserializeQueryParams
    @param {Array<RouteInfo>} routeInfos
    @param {Object} queryParams
    @return {Void}
  */
  _deserializeQueryParams(routeInfos: PrivateRouteInfo[], queryParams: QueryParam) {
    forEachQueryParam(
      this,
      routeInfos,
      queryParams,
      (key: string, value: unknown, qp: QueryParam) => {
        // If we don't have QP meta info for a given key, then we do nothing
        // because all values will be treated as strings
        if (qp) {
          delete queryParams[key];
          queryParams[qp.prop] = qp.route.deserializeQueryParam(value, qp.urlKey, qp.type);
        }
      }
    );
  }

  /**
    Deserializes the value of a query parameter based on a default type

    @private
    @method _deserializeQueryParam
    @param {Object} value
    @param {String} defaultType
  */
  _deserializeQueryParam(value: unknown, defaultType: string) {
    if (value === null || value === undefined) {
      return value;
    } else if (defaultType === 'boolean') {
      return value === 'true';
    } else if (defaultType === 'number') {
      return Number(value).valueOf();
    } else if (defaultType === 'array') {
      return emberA(JSON.parse(value as string));
    }
    return value;
  }

  /**
    Removes (prunes) any query params with default values from the given QP
    object. Default values are determined from the QP meta information per key.

    @private
    @method _pruneDefaultQueryParamValues
    @param {Array<RouteInfo>} routeInfos
    @param {Object} queryParams
    @return {Void}
  */
  _pruneDefaultQueryParamValues(routeInfos: PrivateRouteInfo[], queryParams: {}) {
    let qps = this._queryParamsFor(routeInfos);
    for (let key in queryParams) {
      let qp = qps.map[key];
      if (qp && qp.serializedDefaultValue === queryParams[key]) {
        delete queryParams[key];
      }
    }
  }

  _doTransition(
    _targetRouteName: string,
    models: {}[],
    _queryParams: QueryParam,
    _keepDefaultQueryParamValues?: boolean
  ) {
    let targetRouteName = _targetRouteName || getActiveTargetName(this._routerMicrolib);
    assert(
      `The route ${targetRouteName} was not found`,
      Boolean(targetRouteName) && this._routerMicrolib.hasRoute(targetRouteName)
    );

    let queryParams = {};

    this._processActiveTransitionQueryParams(targetRouteName, models, queryParams, _queryParams);

    assign(queryParams, _queryParams);
    this._prepareQueryParams(
      targetRouteName,
      models,
      queryParams as QueryParam,
      Boolean(_keepDefaultQueryParamValues)
    );

    let transition = this._routerMicrolib.transitionTo(targetRouteName, ...models, { queryParams });

    didBeginTransition(transition, this);

    return transition;
  }

  _processActiveTransitionQueryParams(
    targetRouteName: string,
    models: {}[],
    queryParams: {},
    _queryParams: {}
  ) {
    // merge in any queryParams from the active transition which could include
    // queryParams from the url on initial load.
    if (!this._routerMicrolib.activeTransition) {
      return;
    }

    let unchangedQPs = {};
    let qpUpdates = this._qpUpdates;
    let params = this._routerMicrolib.activeTransition[QUERY_PARAMS_SYMBOL];
    for (let key in params) {
      if (!qpUpdates.has(key)) {
        unchangedQPs[key] = params[key];
      }
    }

    // We need to fully scope queryParams so that we can create one object
    // that represents both passed-in queryParams and ones that aren't changed
    // from the active transition.
    this._fullyScopeQueryParams(targetRouteName, models, _queryParams);
    this._fullyScopeQueryParams(targetRouteName, models, unchangedQPs);
    assign(queryParams, unchangedQPs);
  }

  /**
    Prepares the query params for a URL or Transition. Restores any undefined QP
    keys/values, serializes all values, and then prunes any default values.

    @private
    @method _prepareQueryParams
    @param {String} targetRouteName
    @param {Array<Object>} models
    @param {Object} queryParams
    @param {boolean} keepDefaultQueryParamValues
    @return {Void}
  */
  _prepareQueryParams(
    targetRouteName: string,
    models: {}[],
    queryParams: QueryParam,
    _fromRouterService?: boolean
  ) {
    let state = calculatePostTransitionState(this, targetRouteName, models);
    this._hydrateUnsuppliedQueryParams(state, queryParams, Boolean(_fromRouterService));
    this._serializeQueryParams(state.routeInfos, queryParams);

    if (!_fromRouterService) {
      this._pruneDefaultQueryParamValues(state.routeInfos, queryParams);
    }
  }

  /**
    Returns the meta information for the query params of a given route. This
    will be overridden to allow support for lazy routes.

    @private
    @method _getQPMeta
    @param {RouteInfo} routeInfo
    @return {Object}
  */
  _getQPMeta(routeInfo: PrivateRouteInfo) {
    let route = routeInfo.route;
    return route && get(route, '_qp');
  }

  /**
    Returns a merged query params meta object for a given set of routeInfos.
    Useful for knowing what query params are available for a given route hierarchy.

    @private
    @method _queryParamsFor
    @param {Array<RouteInfo>} routeInfos
    @return {Object}
   */
  _queryParamsFor(routeInfos: PrivateRouteInfo[]) {
    let routeInfoLength = routeInfos.length;
    let leafRouteName = routeInfos[routeInfoLength - 1].name;
    let cached = this._qpCache[leafRouteName];
    if (cached !== undefined) {
      return cached;
    }

    let shouldCache = true;
    let map = {};
    let qps = [];
    let qpsByUrlKey = DEBUG ? {} : null;
    let qpMeta;
    let qp;
    let urlKey;
    let qpOther;

    for (let i = 0; i < routeInfoLength; ++i) {
      qpMeta = this._getQPMeta(routeInfos[i]);

      if (!qpMeta) {
        shouldCache = false;
        continue;
      }

      // Loop over each QP to make sure we don't have any collisions by urlKey
      for (let i = 0; i < qpMeta.qps.length; i++) {
        qp = qpMeta.qps[i];

        if (DEBUG) {
          urlKey = qp.urlKey;
          qpOther = qpsByUrlKey![urlKey];
          if (qpOther && qpOther.controllerName !== qp.controllerName) {
            assert(
              `You're not allowed to have more than one controller property map to the same query param key, but both \`${qpOther.scopedPropertyName}\` and \`${qp.scopedPropertyName}\` map to \`${urlKey}\`. You can fix this by mapping one of the controller properties to a different query param key via the \`as\` config option, e.g. \`${qpOther.prop}: { as: \'other-${qpOther.prop}\' }\``,
              false
            );
          }
          qpsByUrlKey![urlKey] = qp;
        }

        qps.push(qp);
      }

      assign(map, qpMeta.map);
    }

    let finalQPMeta = { qps, map };

    if (shouldCache) {
      this._qpCache[leafRouteName] = finalQPMeta;
    }

    return finalQPMeta;
  }

  /**
    Maps all query param keys to their fully scoped property name of the form
    `controllerName:propName`.

    @private
    @method _fullyScopeQueryParams
    @param {String} leafRouteName
    @param {Array<Object>} contexts
    @param {Object} queryParams
    @return {Void}
  */
  _fullyScopeQueryParams(leafRouteName: string, contexts: {}[], queryParams: {}) {
    let state = calculatePostTransitionState(this, leafRouteName, contexts);
    let routeInfos = state.routeInfos;
    let qpMeta;
    for (let i = 0, len = routeInfos.length; i < len; ++i) {
      qpMeta = this._getQPMeta(routeInfos[i]);

      if (!qpMeta) {
        continue;
      }

      let qp;
      let presentProp;
      for (let j = 0, qpLen = qpMeta.qps.length; j < qpLen; ++j) {
        qp = qpMeta.qps[j];

        presentProp =
          (qp.prop in queryParams && qp.prop) ||
          (qp.scopedPropertyName in queryParams && qp.scopedPropertyName) ||
          (qp.urlKey in queryParams && qp.urlKey);

        if (presentProp) {
          if (presentProp !== qp.scopedPropertyName) {
            queryParams[qp.scopedPropertyName] = queryParams[presentProp];
            delete queryParams[presentProp];
          }
        }
      }
    }
  }

  /**
    Hydrates (adds/restores) any query params that have pre-existing values into
    the given queryParams hash. This is what allows query params to be "sticky"
    and restore their last known values for their scope.

    @private
    @method _hydrateUnsuppliedQueryParams
    @param {TransitionState} state
    @param {Object} queryParams
    @return {Void}
  */
  _hydrateUnsuppliedQueryParams(
    state: TransitionState<Route>,
    queryParams: {},
    _fromRouterService: boolean
  ) {
    let routeInfos = state.routeInfos;
    let appCache = this._bucketCache;
    let qpMeta;
    let qp;
    let presentProp;

    for (let i = 0; i < routeInfos.length; ++i) {
      qpMeta = this._getQPMeta(routeInfos[i]);

      if (!qpMeta) {
        continue;
      }

      for (let j = 0, qpLen = qpMeta.qps.length; j < qpLen; ++j) {
        qp = qpMeta.qps[j];

        presentProp =
          (qp.prop in queryParams && qp.prop) ||
          (qp.scopedPropertyName in queryParams && qp.scopedPropertyName) ||
          (qp.urlKey in queryParams && qp.urlKey);

        assert(
          `You passed the \`${presentProp}\` query parameter during a transition into ${qp.route.routeName}, please update to ${qp.urlKey}`,
          (function() {
            if (qp.urlKey === presentProp) {
              return true;
            }

            if (_fromRouterService && presentProp !== false && qp.urlKey !== qp.prop) {
              // assumptions (mainly from current transitionTo_test):
              // - this is only supposed to be run when there is an alias to a query param and the alias is used to set the param
              // - when there is no alias: qp.urlKey == qp.prop
              return false;
            }

            return true;
          })()
        );

        if (presentProp) {
          if (presentProp !== qp.scopedPropertyName) {
            queryParams[qp.scopedPropertyName] = queryParams[presentProp];
            delete queryParams[presentProp];
          }
        } else {
          let cacheKey = calculateCacheKey(qp.route.fullRouteName, qp.parts, state.params);
          queryParams[qp.scopedPropertyName] = appCache.lookup(cacheKey, qp.prop, qp.defaultValue);
        }
      }
    }
  }

  _scheduleLoadingEvent(transition: Transition, originRoute: Route) {
    this._cancelSlowTransitionTimer();
    this._slowTransitionTimer = scheduleOnce(
      'routerTransitions',
      this,
      '_handleSlowTransition',
      transition,
      originRoute
    );
  }

  currentState: null | RouterState = null;
  targetState = null;

  _handleSlowTransition(transition: Transition, originRoute: Route) {
    if (!this._routerMicrolib.activeTransition) {
      // Don't fire an event if we've since moved on from
      // the transition that put us in a loading state.
      return;
    }
    let targetState = new RouterState(
      this,
      this._routerMicrolib,
      this._routerMicrolib.activeTransition[STATE_SYMBOL]!
    );
    this.set('targetState', targetState);

    transition.trigger(true, 'loading', transition, originRoute);
  }

  _cancelSlowTransitionTimer() {
    if (this._slowTransitionTimer) {
      cancel(this._slowTransitionTimer);
    }
    this._slowTransitionTimer = null;
  }

  // These three helper functions are used to ensure errors aren't
  // re-raised if they're handled in a route's error action.
  _markErrorAsHandled(error: Error) {
    this._handledErrors.add(error);
  }

  _isErrorHandled(error: Error) {
    return this._handledErrors.has(error);
  }

  _clearHandledError(error: Error) {
    this._handledErrors.delete(error);
  }

  _getEngineInstance({
    name,
    instanceId,
    mountPoint,
  }: {
    name: string;
    instanceId: number;
    mountPoint: string;
  }) {
    let engineInstances = this._engineInstances;

    if (!engineInstances[name]) {
      engineInstances[name] = Object.create(null);
    }

    let engineInstance = engineInstances[name][instanceId];

    if (!engineInstance) {
      let owner = getOwner(this);

      assert(
        `You attempted to mount the engine '${name}' in your router map, but the engine can not be found.`,
        owner.hasRegistration(`engine:${name}`)
      );

      engineInstance = owner.buildChildEngineInstance(name, {
        routable: true,
        mountPoint,
      });

      engineInstance.boot();

      engineInstances[name][instanceId] = engineInstance;
    }

    return engineInstance;
  }
}

/*
  Helper function for iterating over routes in a set of routeInfos that are
  at or above the given origin route. Example: if `originRoute` === 'foo.bar'
  and the routeInfos given were for 'foo.bar.baz', then the given callback
  will be invoked with the routes for 'foo.bar', 'foo', and 'application'
  individually.

  If the callback returns anything other than `true`, then iteration will stop.

  @private
  @param {Route} originRoute
  @param {Array<RouteInfo>} routeInfos
  @param {Function} callback
  @return {Void}
 */
function forEachRouteAbove(
  routeInfos: PrivateRouteInfo[],
  callback: (route: Route, routeInfo: PrivateRouteInfo) => boolean
) {
  for (let i = routeInfos.length - 1; i >= 0; --i) {
    let routeInfo = routeInfos[i];
    let route = routeInfo.route;

    // routeInfo.handler being `undefined` generally means either:
    //
    // 1. an error occurred during creation of the route in question
    // 2. the route is across an async boundary (e.g. within an engine)
    //
    // In both of these cases, we cannot invoke the callback on that specific
    // route, because it just doesn't exist...
    if (route === undefined) {
      continue;
    }

    if (callback(route, routeInfo) !== true) {
      return;
    }
  }
}

// These get invoked when an action bubbles above ApplicationRoute
// and are not meant to be overridable.
let defaultActionHandlers = {
  willResolveModel(
    this: EmberRouter,
    _routeInfos: PrivateRouteInfo[],
    transition: Transition,
    originRoute: Route
  ) {
    this._scheduleLoadingEvent(transition, originRoute);
  },

  // Attempt to find an appropriate error route or substate to enter.
  error(routeInfos: PrivateRouteInfo[], error: Error, transition: Transition) {
    let router: any = this;

    let routeInfoWithError = routeInfos[routeInfos.length - 1];

    forEachRouteAbove(routeInfos, (route: Route, routeInfo: PrivateRouteInfo) => {
      // We don't check the leaf most routeInfo since that would
      // technically be below where we're at in the route hierarchy.
      if (routeInfo !== routeInfoWithError) {
        // Check for the existence of an 'error' route.
        let errorRouteName = findRouteStateName(route, 'error');
        if (errorRouteName) {
          router._markErrorAsHandled(error);
          router.intermediateTransitionTo(errorRouteName, error);
          return false;
        }
      }

      // Check for an 'error' substate route
      let errorSubstateName = findRouteSubstateName(route, 'error');
      if (errorSubstateName) {
        router._markErrorAsHandled(error);
        router.intermediateTransitionTo(errorSubstateName, error);
        return false;
      }

      return true;
    });

    logError(error, `Error while processing route: ${transition.targetName}`);
  },

  // Attempt to find an appropriate loading route or substate to enter.
  loading(routeInfos: PrivateRouteInfo[], transition: Transition) {
    let router: any = this;

    let routeInfoWithSlowLoading = routeInfos[routeInfos.length - 1];

    forEachRouteAbove(routeInfos, (route: Route, routeInfo: PrivateRouteInfo) => {
      // We don't check the leaf most routeInfos since that would
      // technically be below where we're at in the route hierarchy.
      if (routeInfo !== routeInfoWithSlowLoading) {
        // Check for the existence of a 'loading' route.
        let loadingRouteName = findRouteStateName(route, 'loading');
        if (loadingRouteName) {
          router.intermediateTransitionTo(loadingRouteName);
          return false;
        }
      }

      // Check for loading substate
      let loadingSubstateName = findRouteSubstateName(route, 'loading');
      if (loadingSubstateName) {
        router.intermediateTransitionTo(loadingSubstateName);
        return false;
      }

      // Don't bubble above pivot route.
      return (transition.pivotHandler as any) !== route;
    });
  },
};

function logError(_error: any, initialMessage: string) {
  let errorArgs = [];
  let error;
  if (_error && typeof _error === 'object' && typeof _error.errorThrown === 'object') {
    error = _error.errorThrown;
  } else {
    error = _error;
  }

  if (initialMessage) {
    errorArgs.push(initialMessage);
  }

  if (error) {
    if (error.message) {
      errorArgs.push(error.message);
    }
    if (error.stack) {
      errorArgs.push(error.stack);
    }

    if (typeof error === 'string') {
      errorArgs.push(error);
    }
  }

  console.error(...errorArgs); //eslint-disable-line no-console
}

/**
  Finds the name of the substate route if it exists for the given route. A
  substate route is of the form `route_state`, such as `foo_loading`.

  @private
  @param {Route} route
  @param {String} state
  @return {String}
*/
function findRouteSubstateName(route: Route, state: string) {
  let owner = getOwner(route);
  let { routeName, fullRouteName, _router: router } = route;

  let substateName = `${routeName}_${state}`;
  let substateNameFull = `${fullRouteName}_${state}`;

  return routeHasBeenDefined(owner, router, substateName, substateNameFull) ? substateNameFull : '';
}

/**
  Finds the name of the state route if it exists for the given route. A state
  route is of the form `route.state`, such as `foo.loading`. Properly Handles
  `application` named routes.

  @private
  @param {Route} route
  @param {String} state
  @return {String}
*/
function findRouteStateName(route: Route, state: string) {
  let owner = getOwner(route);
  let { routeName, fullRouteName, _router: router } = route;

  let stateName = routeName === 'application' ? state : `${routeName}.${state}`;
  let stateNameFull = fullRouteName === 'application' ? state : `${fullRouteName}.${state}`;

  return routeHasBeenDefined(owner, router, stateName, stateNameFull) ? stateNameFull : '';
}

/**
  Determines whether or not a route has been defined by checking that the route
  is in the Router's map and the owner has a registration for that route.

  @private
  @param {Owner} owner
  @param {Router} router
  @param {String} localName
  @param {String} fullName
  @return {Boolean}
*/
function routeHasBeenDefined(owner: Owner, router: any, localName: string, fullName: string) {
  let routerHasRoute = router.hasRoute(fullName);
  let ownerHasRoute =
    owner.hasRegistration(`template:${localName}`) || owner.hasRegistration(`route:${localName}`);
  return routerHasRoute && ownerHasRoute;
}

export function triggerEvent(
  this: EmberRouter,
  routeInfos: PrivateRouteInfo[],
  ignoreFailure: boolean,
  name: string,
  args: any[]
) {
  if (!routeInfos) {
    if (ignoreFailure) {
      return;
    }
    throw new EmberError(
      `Can't trigger action '${name}' because your app hasn't finished transitioning into its first route. To trigger an action on destination routes during a transition, you can call \`.send()\` on the \`Transition\` object passed to the \`model/beforeModel/afterModel\` hooks.`
    );
  }

  let eventWasHandled = false;
  let routeInfo, handler, actionHandler;

  for (let i = routeInfos.length - 1; i >= 0; i--) {
    routeInfo = routeInfos[i];
    handler = routeInfo.route;
    actionHandler = handler && handler.actions && handler.actions[name];
    if (actionHandler) {
      if (actionHandler.apply(handler, args) === true) {
        eventWasHandled = true;
      } else {
        // Should only hit here if a non-bubbling error action is triggered on a route.
        if (name === 'error') {
          handler!._router._markErrorAsHandled(args[0] as Error);
        }
        return;
      }
    }
  }

  let defaultHandler = defaultActionHandlers[name];
  if (defaultHandler) {
    defaultHandler.apply(this, [routeInfos, ...args]);
    return;
  }

  if (!eventWasHandled && !ignoreFailure) {
    throw new EmberError(
      `Nothing handled the action '${name}'. If you did handle the action, this error can be caused by returning true from an action handler in a controller, causing the action to bubble.`
    );
  }
}

function calculatePostTransitionState(
  emberRouter: EmberRouter,
  leafRouteName: string,
  contexts: {}[]
) {
  let state = emberRouter._routerMicrolib.applyIntent(leafRouteName, contexts);
  let { routeInfos, params } = state;

  for (let i = 0; i < routeInfos.length; ++i) {
    let routeInfo = routeInfos[i];

    // If the routeInfo is not resolved, we serialize the context into params
    if (!routeInfo.isResolved) {
      params[routeInfo.name] = routeInfo.serialize(routeInfo.context);
    } else {
      params[routeInfo.name] = routeInfo.params;
    }
  }
  return state;
}

function updatePaths(router: EmberRouter) {
  let infos = router._routerMicrolib.currentRouteInfos!;
  if (infos.length === 0) {
    return;
  }

  let path = EmberRouter._routePath(infos);
  let currentRouteName = infos[infos.length - 1].name;
  let currentURL = router.get('location').getURL();

  set(router, 'currentPath', path);
  set(router, 'currentRouteName', currentRouteName);
  set(router, 'currentURL', currentURL);

  let appController = getOwner(router).lookup<Controller>('controller:application');

  if (!appController) {
    // appController might not exist when top-level loading/error
    // substates have been entered since ApplicationRoute hasn't
    // actually been entered at that point.
    return;
  }
  if (APP_CTRL_ROUTER_PROPS) {
    if (!('currentPath' in appController)) {
      Object.defineProperty(appController, 'currentPath', {
        get() {
          deprecate(
            'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.',
            false,
            {
              id: 'application-controller.router-properties',
              until: '4.0.0',
              url:
                'https://emberjs.com/deprecations/v3.x#toc_application-controller-router-properties',
            }
          );
          return get(router, 'currentPath');
        },
      });
    }
    notifyPropertyChange(appController, 'currentPath');

    if (!('currentRouteName' in appController)) {
      Object.defineProperty(appController, 'currentRouteName', {
        get() {
          deprecate(
            'Accessing `currentRouteName` on `controller:application` is deprecated, use the `currentRouteName` property on `service:router` instead.',
            false,
            {
              id: 'application-controller.router-properties',
              until: '4.0.0',
              url:
                'https://emberjs.com/deprecations/v3.x#toc_application-controller-router-properties',
            }
          );
          return get(router, 'currentRouteName');
        },
      });
    }
    notifyPropertyChange(appController, 'currentRouteName');
  }
}

EmberRouter.reopenClass({
  /**
    The `Router.map` function allows you to define mappings from URLs to routes
    in your application. These mappings are defined within the
    supplied callback function using `this.route`.

    The first parameter is the name of the route which is used by default as the
    path name as well.

    The second parameter is the optional options hash. Available options are:

      * `path`: allows you to provide your own path as well as mark dynamic
        segments.
      * `resetNamespace`: false by default; when nesting routes, ember will
        combine the route names to form the fully-qualified route name, which is
        used with `{{link-to}}` or manually transitioning to routes. Setting
        `resetNamespace: true` will cause the route not to inherit from its
        parent route's names. This is handy for preventing extremely long route names.
        Keep in mind that the actual URL path behavior is still retained.

    The third parameter is a function, which can be used to nest routes.
    Nested routes, by default, will have the parent route tree's route name and
    path prepended to it's own.

    ```app/router.js
    Router.map(function(){
      this.route('post', { path: '/post/:post_id' }, function() {
        this.route('edit');
        this.route('comments', { resetNamespace: true }, function() {
          this.route('new');
        });
      });
    });
    ```

    @method map
    @param callback
    @public
  */
  map(callback: MatchCallback) {
    if (!this.dslCallbacks) {
      this.dslCallbacks = [];
      this.reopenClass({ dslCallbacks: this.dslCallbacks });
    }

    this.dslCallbacks.push(callback);

    return this;
  },

  _routePath(routeInfos: PrivateRouteInfo[]) {
    let path: string[] = [];

    // We have to handle coalescing resource names that
    // are prefixed with their parent's names, e.g.
    // ['foo', 'foo.bar.baz'] => 'foo.bar.baz', not 'foo.foo.bar.baz'

    function intersectionMatches(a1: string[], a2: string[]) {
      for (let i = 0; i < a1.length; ++i) {
        if (a1[i] !== a2[i]) {
          return false;
        }
      }
      return true;
    }

    let name, nameParts, oldNameParts;
    for (let i = 1; i < routeInfos.length; i++) {
      name = routeInfos[i].name;
      nameParts = name.split('.');
      oldNameParts = slice.call(path);

      while (oldNameParts.length) {
        if (intersectionMatches(oldNameParts, nameParts)) {
          break;
        }
        oldNameParts.shift();
      }

      path.push(...nameParts.slice(oldNameParts.length));
    }

    return path.join('.');
  },
});

function didBeginTransition(transition: Transition, router: EmberRouter) {
  let routerState = new RouterState(router, router._routerMicrolib, transition[STATE_SYMBOL]!);

  if (!router.currentState) {
    router.set('currentState', routerState);
  }
  router.set('targetState', routerState);

  transition.promise = transition.catch((error: any) => {
    if (router._isErrorHandled(error)) {
      router._clearHandledError(error);
    } else {
      throw error;
    }
  }, 'Transition Error');
}

function forEachQueryParam(
  router: EmberRouter,
  routeInfos: PrivateRouteInfo[],
  queryParams: QueryParam,
  callback: (key: string, value: unknown, qp: QueryParam) => void
) {
  let qpCache = router._queryParamsFor(routeInfos);

  for (let key in queryParams) {
    if (!queryParams.hasOwnProperty(key)) {
      continue;
    }
    let value = queryParams[key];
    let qp = qpCache.map[key];

    callback(key, value, qp);
  }
}

function findLiveRoute(liveRoutes: OutletState, name: string) {
  if (!liveRoutes) {
    return;
  }
  let stack = [liveRoutes];
  while (stack.length > 0) {
    let test = stack.shift();
    if (test!.render.name === name) {
      return test;
    }
    let outlets = test!.outlets;
    for (let outletName in outlets) {
      stack.push(outlets[outletName]);
    }
  }

  return;
}

function appendLiveRoute(
  liveRoutes: OutletState,
  defaultParentState: OutletState,
  renderOptions: RenderOptions
) {
  let target;
  let myState = {
    render: renderOptions,
    outlets: Object.create(null),
    wasUsed: false,
  };
  if (renderOptions.into) {
    target = findLiveRoute(liveRoutes, renderOptions.into);
  } else {
    target = defaultParentState;
  }
  if (target) {
    set(target.outlets, renderOptions.outlet, myState);
  } else {
    liveRoutes = myState as any;
  }

  return {
    liveRoutes,
    ownState: myState,
  };
}

function representEmptyRoute(
  liveRoutes: OutletState,
  defaultParentState: OutletState,
  route: Route
) {
  // the route didn't render anything
  let alreadyAppended = findLiveRoute(liveRoutes, route.routeName);
  if (alreadyAppended) {
    // But some other route has already rendered our default
    // template, so that becomes the default target for any
    // children we may have.
    return alreadyAppended;
  } else {
    // Create an entry to represent our default template name,
    // just so other routes can target it and inherit its place
    // in the outlet hierarchy.
    defaultParentState.outlets.main = {
      render: {
        name: route.routeName,
        outlet: 'main',
      },
      outlets: {},
    };
    return defaultParentState;
  }
}

EmberRouter.reopen(Evented, {
  /**
    Handles updating the paths and notifying any listeners of the URL
    change.

    Triggers the router level `didTransition` hook.

    For example, to notify google analytics when the route changes,
    you could use this hook.  (Note: requires also including GA scripts, etc.)

    ```javascript
    import config from './config/environment';
    import EmberRouter from '@ember/routing/router';
    import { inject as service } from '@ember/service';

    let Router = EmberRouter.extend({
      location: config.locationType,

      router: service(),

      didTransition: function() {
        this._super(...arguments);

        ga('send', 'pageview', {
          page: this.router.currentURL,
          title: this.router.currentRouteName,
        });
      }
    });
    ```

    @method didTransition
    @public
    @since 1.2.0
  */
  didTransition: defaultDidTransition,

  /**
    Handles notifying any listeners of an impending URL
    change.

    Triggers the router level `willTransition` hook.

    @method willTransition
    @public
    @since 1.11.0
  */
  willTransition: defaultWillTransition,
  /**
   Represents the URL of the root of the application, often '/'. This prefix is
   assumed on all routes defined on this router.

   @property rootURL
   @default '/'
   @public
  */
  rootURL: '/',

  /**
   The `location` property determines the type of URL's that your
   application will use.

   The following location types are currently available:

   * `history` - use the browser's history API to make the URLs look just like any standard URL
   * `hash` - use `#` to separate the server part of the URL from the Ember part: `/blog/#/posts/new`
   * `none` - do not store the Ember URL in the actual browser URL (mainly used for testing)
   * `auto` - use the best option based on browser capabilities: `history` if possible, then `hash` if possible, otherwise `none`

   This value is defaulted to `auto` by the `locationType` setting of `/config/environment.js`

   @property location
   @default 'hash'
   @see {Location}
   @public
 */
  location: 'hash',

  /**
   Represents the current URL.

   @property url
   @type {String}
   @private
 */
  url: computed(function(this: Router<Route>) {
    let location = get(this, 'location');

    if (typeof location === 'string') {
      return undefined;
    }

    return location.getURL();
  }),
});

if (ROUTER_EVENTS) {
  EmberRouter.reopen(ROUTER_EVENT_DEPRECATIONS);
}
export default EmberRouter;
