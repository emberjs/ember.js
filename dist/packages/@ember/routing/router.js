import { privatize as P } from '@ember/-internals/container';
import { computed, get, set } from '@ember/object';
import { getOwner } from '@ember/owner';
import { BucketCache, DSL, RouterState } from '@ember/routing/-internals';
import { calculateCacheKey, extractRouteArgs, getActiveTargetName, resemblesURL } from './lib/utils';
import EmberObject from '@ember/object';
import { A as emberA } from '@ember/array';
import { typeOf } from '@ember/utils';
import Evented from '@ember/object/evented';
import { assert, info } from '@ember/debug';
import { cancel, once, run, scheduleOnce } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { defaultSerialize, getFullQueryParams, getRenderState, hasDefaultSerialize } from '@ember/routing/route';
import Router, { logAbort, STATE_SYMBOL } from 'router_js';
import EngineInstance from '@ember/engine/instance';
/**
@module @ember/routing/router
*/
function defaultDidTransition(infos) {
  updatePaths(this);
  this._cancelSlowTransitionTimer();
  this.notifyPropertyChange('url');
  this.set('currentState', this.targetState);
  if (DEBUG) {
    // @ts-expect-error namespace isn't public
    if (this.namespace.LOG_TRANSITIONS) {
      // eslint-disable-next-line no-console
      console.log(`Transitioned into '${EmberRouter._routePath(infos)}'`);
    }
  }
}
function defaultWillTransition(oldInfos, newInfos) {
  if (DEBUG) {
    // @ts-expect-error namespace isn't public
    if (this.namespace.LOG_TRANSITIONS) {
      // eslint-disable-next-line no-console
      console.log(`Preparing to transition from '${EmberRouter._routePath(oldInfos)}' to '${EmberRouter._routePath(newInfos)}'`);
    }
  }
}
let freezeRouteInfo;
if (DEBUG) {
  freezeRouteInfo = transition => {
    if (transition.from !== null && !Object.isFrozen(transition.from)) {
      Object.freeze(transition.from);
    }
    if (transition.to !== null && !Object.isFrozen(transition.to)) {
      Object.freeze(transition.to);
    }
  };
}
function K() {
  return this;
}
const {
  slice
} = Array.prototype;
/**
  The `EmberRouter` class manages the application state and URLs. Refer to
  the [routing guide](https://guides.emberjs.com/release/routing/) for documentation.

  @class EmberRouter
  @extends EmberObject
  @uses Evented
  @public
*/
class EmberRouter extends EmberObject.extend(Evented) {
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
  static map(callback) {
    if (!this.dslCallbacks) {
      this.dslCallbacks = [];
      // FIXME: Can we remove this?
      this.reopenClass({
        dslCallbacks: this.dslCallbacks
      });
    }
    this.dslCallbacks.push(callback);
    return this;
  }
  static _routePath(routeInfos) {
    let path = [];
    // We have to handle coalescing resource names that
    // are prefixed with their parent's names, e.g.
    // ['foo', 'foo.bar.baz'] => 'foo.bar.baz', not 'foo.foo.bar.baz'
    function intersectionMatches(a1, a2) {
      for (let i = 0; i < a1.length; ++i) {
        if (a1[i] !== a2[i]) {
          return false;
        }
      }
      return true;
    }
    let name, nameParts, oldNameParts;
    for (let i = 1; i < routeInfos.length; i++) {
      let routeInfo = routeInfos[i];
      assert('has routeInfo', routeInfo);
      name = routeInfo.name;
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
  }
  // Note that owner is actually required in this scenario, but since it is strictly
  // optional in other contexts trying to make it required here confuses TS.
  constructor(owner) {
    super(owner);
    this._didSetupRouter = false;
    this._initialTransitionStarted = false;
    this.currentURL = null;
    this.currentRouteName = null;
    this.currentPath = null;
    this.currentRoute = null;
    this._qpCache = Object.create(null);
    // Set of QueryParam['urlKey']
    this._qpUpdates = new Set();
    this._queuedQPChanges = {};
    this._toplevelView = null;
    this._handledErrors = new Set();
    this._engineInstances = Object.create(null);
    this._engineInfoByRoute = Object.create(null);
    this._slowTransitionTimer = null;
    this.currentState = null;
    this.targetState = null;
    assert('BUG: Missing owner', owner);
    this._resetQueuedQueryParameterChanges();
    this.namespace = owner.lookup('application:main');
    let bucketCache = owner.lookup(P`-bucket-cache:main`);
    assert('BUG: BucketCache should always be present', bucketCache instanceof BucketCache);
    this._bucketCache = bucketCache;
    let routerService = owner.lookup('service:router');
    assert('BUG: RouterService should always be present', routerService !== undefined);
    this._routerService = routerService;
  }
  _initRouterJs() {
    let location = get(this, 'location');
    let router = this;
    const owner = getOwner(this);
    assert('Router is unexpectedly missing an owner', owner);
    let seen = Object.create(null);
    class PrivateRouter extends Router {
      getRoute(name) {
        let routeName = name;
        let routeOwner = owner;
        let engineInfo = router._engineInfoByRoute[routeName];
        if (engineInfo) {
          let engineInstance = router._getEngineInstance(engineInfo);
          routeOwner = engineInstance;
          routeName = engineInfo.localFullName;
        }
        let fullRouteName = `route:${routeName}`;
        assert('Route is unexpectedly missing an owner', routeOwner);
        let route = routeOwner.lookup(fullRouteName);
        if (seen[name]) {
          assert('seen routes should exist', route);
          return route;
        }
        seen[name] = true;
        if (!route) {
          // SAFETY: this is configured in `commonSetupRegistry` in the
          // `@ember/application/lib` package.
          let DefaultRoute = routeOwner.factoryFor('route:basic').class;
          routeOwner.register(fullRouteName, DefaultRoute.extend());
          route = routeOwner.lookup(fullRouteName);
          if (DEBUG) {
            if (router.namespace.LOG_ACTIVE_GENERATION) {
              info(`generated -> ${fullRouteName}`, {
                fullName: fullRouteName
              });
            }
          }
        }
        route._setRouteName(routeName);
        if (engineInfo && !hasDefaultSerialize(route)) {
          throw new Error('Defining a custom serialize method on an Engine route is not supported.');
        }
        return route;
      }
      getSerializer(name) {
        let engineInfo = router._engineInfoByRoute[name];
        // If this is not an Engine route, we fall back to the handler for serialization
        if (!engineInfo) {
          return;
        }
        return engineInfo.serializeMethod || defaultSerialize;
      }
      updateURL(path) {
        once(() => {
          location.setURL(path);
          set(router, 'currentURL', path);
        });
      }
      // TODO: merge into routeDidChange
      didTransition(infos) {
        assert('You attempted to override the "didTransition" method which has been deprecated. Please inject the router service and listen to the "routeDidChange" event.', router.didTransition === defaultDidTransition);
        router.didTransition(infos);
      }
      // TODO: merge into routeWillChange
      willTransition(oldInfos, newInfos) {
        assert('You attempted to override the "willTransition" method which has been deprecated. Please inject the router service and listen to the "routeWillChange" event.', router.willTransition === defaultWillTransition);
        router.willTransition(oldInfos, newInfos);
      }
      triggerEvent(routeInfos, ignoreFailure, name, args) {
        return triggerEvent.bind(router)(routeInfos, ignoreFailure, name, args);
      }
      routeWillChange(transition) {
        router.trigger('routeWillChange', transition);
        if (DEBUG) {
          freezeRouteInfo(transition);
        }
        router._routerService.trigger('routeWillChange', transition);
        // in case of intermediate transition we update the current route
        // to make router.currentRoute.name consistent with router.currentRouteName
        // see https://github.com/emberjs/ember.js/issues/19449
        if (transition.isIntermediate) {
          router.set('currentRoute', transition.to);
        }
      }
      routeDidChange(transition) {
        router.set('currentRoute', transition.to);
        once(() => {
          router.trigger('routeDidChange', transition);
          if (DEBUG) {
            freezeRouteInfo(transition);
          }
          router._routerService.trigger('routeDidChange', transition);
        });
      }
      transitionDidError(error, transition) {
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
      replaceURL(url) {
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
    let routerMicrolib = this._routerMicrolib = new PrivateRouter();
    let dslCallbacks = this.constructor.dslCallbacks || [K];
    let dsl = this._buildDSL();
    dsl.route('application', {
      path: '/',
      resetNamespace: true,
      overrideNameAssertion: true
    }, function () {
      for (let i = 0; i < dslCallbacks.length; i++) {
        dslCallbacks[i].call(this);
      }
    });
    if (DEBUG) {
      if (this.namespace.LOG_TRANSITIONS_INTERNAL) {
        routerMicrolib.log = console.log.bind(console); // eslint-disable-line no-console
      }
    }

    routerMicrolib.map(dsl.generate());
  }
  _buildDSL() {
    let enableLoadingSubstates = this._hasModuleBasedResolver();
    let router = this;
    const owner = getOwner(this);
    assert('Router is unexpectedly missing an owner', owner);
    let options = {
      enableLoadingSubstates,
      resolveRouteMap(name) {
        return owner.factoryFor(`route-map:${name}`);
      },
      addRouteForEngine(name, engineInfo) {
        if (!router._engineInfoByRoute[name]) {
          router._engineInfoByRoute[name] = engineInfo;
        }
      }
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
    assert('Router is unexpectedly missing an owner', owner);
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
    if (this.setupRouter()) {
      let initialURL = get(this, 'initialURL');
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
    if (this._didSetupRouter) {
      return false;
    }
    this._didSetupRouter = true;
    this._setupLocation();
    let location = get(this, 'location');
    // Allow the Location class to cancel the router setup while it refreshes
    // the page
    if (get(location, 'cancelRouterSetup')) {
      return false;
    }
    this._initRouterJs();
    location.onUpdateURL(url => {
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
    if (!routeInfos) {
      return;
    }
    let root = null;
    let parent = null;
    for (let routeInfo of routeInfos) {
      let route = routeInfo.route;
      let render = getRenderState(route);
      if (render) {
        let state = {
          render,
          outlets: {
            main: undefined
          }
        };
        if (parent) {
          parent.outlets.main = state;
        } else {
          root = state;
        }
        parent = state;
      } else {
        // It used to be that we would create a stub entry and keep traversing,
        // but I don't think that is necessary anymore – if a parent route did
        // not render, then the child routes have nowhere to render into these
        // days. That wasn't always the case since in the past any route can
        // render into any other route's outlets.
        break;
      }
    }
    // when a transitionTo happens after the validation phase
    // during the initial transition _setOutlets is called
    // when no routes are active. However, it will get called
    // again with the correct values during the next turn of
    // the runloop
    if (root === null) {
      return;
    }
    if (!this._toplevelView) {
      let owner = getOwner(this);
      assert('Router is unexpectedly missing an owner', owner);
      // SAFETY: we don't presently have any type registries internally to make
      // this safe, so in each of these cases we assume that nothing *else* is
      // registered at this `FullName`, and simply check to make sure that
      // *something* is.
      let OutletView = owner.factoryFor('view:-outlet');
      assert('[BUG] unexpectedly missing `view:-outlet`', OutletView !== undefined);
      let application = owner.lookup('application:main');
      assert('[BUG] unexpectedly missing `application:-main`', application !== undefined);
      let environment = owner.lookup('-environment:main');
      assert('[BUG] unexpectedly missing `-environment:main`', environment !== undefined);
      let template = owner.lookup('template:-outlet');
      assert('[BUG] unexpectedly missing `template:-outlet`', template !== undefined);
      this._toplevelView = OutletView.create({
        environment,
        template,
        application
      });
      this._toplevelView.setOutletState(root);
      // TODO(SAFETY): At least one test runs without this set correctly. At a
      // later time, update the test to configure this correctly. The test ID:
      // `Router Service - non application test:  RouterService#transitionTo with basic route`
      let instance = owner.lookup('-application-instance:main');
      // let instance = owner.lookup('-application-instance:main') as ApplicationInstance | undefined;
      // assert('[BUG] unexpectedly missing `-application-instance:main`', instance !== undefined);
      if (instance) {
        // SAFETY: LOL. This is calling a deprecated API with a type that we
        // cannot actually confirm at a type level *is* a `ViewMixin`. Seems:
        // not great on multiple fronts!
        instance.didCreateRootView(this._toplevelView);
      }
    } else {
      this._toplevelView.setOutletState(root);
    }
  }
  handleURL(url) {
    // Until we have an ember-idiomatic way of accessing #hashes, we need to
    // remove it because router.js doesn't know how to handle it.
    let _url = url.split(/#(.+)?/)[0];
    return this._doURLTransition('handleURL', _url);
  }
  _doURLTransition(routerJsMethod, url) {
    this._initialTransitionStarted = true;
    let transition = this._routerMicrolib[routerJsMethod](url || '/');
    didBeginTransition(transition, this);
    return transition;
  }
  /**
    Transition the application into another route. The route may
    be either a single route or route path:
       @method transitionTo
    @param {String} [name] the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used while
      transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @return {Transition} the transition object associated with this
      attempted transition
    @public
  */
  transitionTo(...args) {
    if (resemblesURL(args[0])) {
      assert(`A transition was attempted from '${this.currentRouteName}' to '${args[0]}' but the application instance has already been destroyed.`, !this.isDestroying && !this.isDestroyed);
      return this._doURLTransition('transitionTo', args[0]);
    }
    let {
      routeName,
      models,
      queryParams
    } = extractRouteArgs(args);
    assert(`A transition was attempted from '${this.currentRouteName}' to '${routeName}' but the application instance has already been destroyed.`, !this.isDestroying && !this.isDestroyed);
    return this._doTransition(routeName, models, queryParams);
  }
  intermediateTransitionTo(name, ...args) {
    this._routerMicrolib.intermediateTransitionTo(name, ...args);
    updatePaths(this);
    if (DEBUG) {
      let infos = this._routerMicrolib.currentRouteInfos;
      if (this.namespace.LOG_TRANSITIONS) {
        assert('expected infos to be set', infos);
        // eslint-disable-next-line no-console
        console.log(`Intermediate-transitioned into '${EmberRouter._routePath(infos)}'`);
      }
    }
  }
  /**
    Similar to `transitionTo`, but instead of adding the destination to the browser's URL history,
    it replaces the entry for the current route.
    When the user clicks the "back" button in the browser, there will be fewer steps.
    This is most commonly used to manage redirects in a way that does not cause confusing additions
    to the user's browsing history.
       @method replaceWith
    @param {String} [name] the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used while
      transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @return {Transition} the transition object associated with this
      attempted transition
    @public
  */
  replaceWith(...args) {
    return this.transitionTo(...args).method('replace');
  }
  generate(name, ...args) {
    let url = this._routerMicrolib.generate(name, ...args);
    assert('expected non-string location', typeof this.location !== 'string');
    return this.location.formatURL(url);
  }
  /**
    Determines if the supplied route is currently active.
       @method isActive
    @param routeName
    @return {Boolean}
    @private
  */
  isActive(routeName) {
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
  isActiveIntent(routeName, models, queryParams) {
    return this.currentState.isActiveIntent(routeName, models, queryParams);
  }
  send(name, ...args) {
    /*name, context*/
    this._routerMicrolib.trigger(name, ...args);
  }
  /**
    Does this router instance have the given route.
       @method hasRoute
    @return {Boolean}
    @private
  */
  hasRoute(route) {
    return this._routerMicrolib.hasRoute(route);
  }
  /**
    Resets the state of the router by clearing the current route
    handlers and deactivating them.
       @private
    @method reset
   */
  reset() {
    this._didSetupRouter = false;
    this._initialTransitionStarted = false;
    if (this._routerMicrolib) {
      this._routerMicrolib.reset();
    }
  }
  willDestroy() {
    if (this._toplevelView) {
      this._toplevelView.destroy();
      this._toplevelView = null;
    }
    super.willDestroy();
    this.reset();
    let instances = this._engineInstances;
    for (let name in instances) {
      let instanceMap = instances[name];
      assert('has instanceMap', instanceMap);
      for (let id in instanceMap) {
        let instance = instanceMap[id];
        assert('has instance', instance);
        run(instance, 'destroy');
      }
    }
  }
  /*
    Called when an active route's query parameter has changed.
    These changes are batched into a runloop run and trigger
    a single transition.
  */
  _activeQPChanged(queryParameterName, newValue) {
    this._queuedQPChanges[queryParameterName] = newValue;
    once(this, this._fireQueryParamTransition);
  }
  // The queryParameterName is QueryParam['urlKey']
  _updatingQPChanged(queryParameterName) {
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
    this.transitionTo({
      queryParams: this._queuedQPChanges
    });
    this._resetQueuedQueryParameterChanges();
  }
  _setupLocation() {
    let location = this.location;
    let rootURL = this.rootURL;
    let owner = getOwner(this);
    assert('Router is unexpectedly missing an owner', owner);
    if ('string' === typeof location) {
      let resolvedLocation = owner.lookup(`location:${location}`);
      assert(`Could not resolve a location class at 'location:${location}'`, resolvedLocation);
      location = set(this, 'location', resolvedLocation);
    }
    if (location !== null && typeof location === 'object') {
      if (rootURL) {
        set(location, 'rootURL', rootURL);
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
  _serializeQueryParams(routeInfos, queryParams) {
    forEachQueryParam(this, routeInfos, queryParams, (key, value, qp) => {
      if (qp) {
        delete queryParams[key];
        queryParams[qp.urlKey] = qp.route.serializeQueryParam(value, qp.urlKey, qp.type);
      } else if (value === undefined) {
        return; // We don't serialize undefined values
      } else {
        queryParams[key] = this._serializeQueryParam(value, typeOf(value));
      }
    });
  }
  /**
    Serializes the value of a query parameter based on a type
       @private
    @method _serializeQueryParam
    @param {Object} value
    @param {String} type
  */
  _serializeQueryParam(value, type) {
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
  _deserializeQueryParams(routeInfos, queryParams) {
    forEachQueryParam(this, routeInfos, queryParams, (key, value, qp) => {
      // If we don't have QP meta info for a given key, then we do nothing
      // because all values will be treated as strings
      if (qp) {
        delete queryParams[key];
        queryParams[qp.prop] = qp.route.deserializeQueryParam(value, qp.urlKey, qp.type);
      }
    });
  }
  /**
    Deserializes the value of a query parameter based on a default type
       @private
    @method _deserializeQueryParam
    @param {Object} value
    @param {String} defaultType
  */
  _deserializeQueryParam(value, defaultType) {
    if (value === null || value === undefined) {
      return value;
    } else if (defaultType === 'boolean') {
      return value === 'true';
    } else if (defaultType === 'number') {
      return Number(value).valueOf();
    } else if (defaultType === 'array') {
      return emberA(JSON.parse(value));
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
  _pruneDefaultQueryParamValues(routeInfos, queryParams) {
    let qps = this._queryParamsFor(routeInfos);
    for (let key in queryParams) {
      let qp = qps.map[key];
      if (qp && qp.serializedDefaultValue === queryParams[key]) {
        delete queryParams[key];
      }
    }
  }
  _doTransition(_targetRouteName, models, _queryParams, _fromRouterService) {
    let targetRouteName = _targetRouteName || getActiveTargetName(this._routerMicrolib);
    assert(`The route ${targetRouteName} was not found`, Boolean(targetRouteName) && this._routerMicrolib.hasRoute(targetRouteName));
    this._initialTransitionStarted = true;
    let queryParams = {};
    this._processActiveTransitionQueryParams(targetRouteName, models, queryParams, _queryParams);
    Object.assign(queryParams, _queryParams);
    this._prepareQueryParams(targetRouteName, models, queryParams, Boolean(_fromRouterService));
    let transition = this._routerMicrolib.transitionTo(targetRouteName, ...models, {
      queryParams
    });
    didBeginTransition(transition, this);
    return transition;
  }
  _processActiveTransitionQueryParams(targetRouteName, models, queryParams, _queryParams) {
    // merge in any queryParams from the active transition which could include
    // queryParams from the url on initial load.
    if (!this._routerMicrolib.activeTransition) {
      return;
    }
    let unchangedQPs = {};
    let qpUpdates = this._qpUpdates;
    let params = getFullQueryParams(this, this._routerMicrolib.activeTransition[STATE_SYMBOL]);
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
    Object.assign(queryParams, unchangedQPs);
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
  _prepareQueryParams(targetRouteName, models, queryParams, _fromRouterService) {
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
  _getQPMeta(routeInfo) {
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
  _queryParamsFor(routeInfos) {
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
    let urlKey;
    let qpOther;
    for (let routeInfo of routeInfos) {
      qpMeta = this._getQPMeta(routeInfo);
      if (!qpMeta) {
        shouldCache = false;
        continue;
      }
      // Loop over each QP to make sure we don't have any collisions by urlKey
      for (let qp of qpMeta.qps) {
        if (DEBUG) {
          urlKey = qp.urlKey;
          qpOther = qpsByUrlKey[urlKey];
          if (qpOther && qpOther.controllerName !== qp.controllerName) {
            assert(`You're not allowed to have more than one controller property map to the same query param key, but both \`${qpOther.scopedPropertyName}\` and \`${qp.scopedPropertyName}\` map to \`${urlKey}\`. You can fix this by mapping one of the controller properties to a different query param key via the \`as\` config option, e.g. \`${qpOther.prop}: { as: 'other-${qpOther.prop}' }\``, false);
          }
          qpsByUrlKey[urlKey] = qp;
        }
        qps.push(qp);
      }
      Object.assign(map, qpMeta.map);
    }
    let finalQPMeta = {
      qps,
      map
    };
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
  _fullyScopeQueryParams(leafRouteName, contexts, queryParams) {
    let state = calculatePostTransitionState(this, leafRouteName, contexts);
    let routeInfos = state.routeInfos;
    let qpMeta;
    for (let routeInfo of routeInfos) {
      qpMeta = this._getQPMeta(routeInfo);
      if (!qpMeta) {
        continue;
      }
      for (let qp of qpMeta.qps) {
        let presentProp = qp.prop in queryParams && qp.prop || qp.scopedPropertyName in queryParams && qp.scopedPropertyName || qp.urlKey in queryParams && qp.urlKey;
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
  _hydrateUnsuppliedQueryParams(state, queryParams, _fromRouterService) {
    let routeInfos = state.routeInfos;
    let appCache = this._bucketCache;
    let qpMeta;
    let qp;
    let presentProp;
    for (let routeInfo of routeInfos) {
      qpMeta = this._getQPMeta(routeInfo);
      if (!qpMeta) {
        continue;
      }
      // Needs to stay for index loop to avoid throwIfClosureRequired
      for (let j = 0, qpLen = qpMeta.qps.length; j < qpLen; ++j) {
        qp = qpMeta.qps[j];
        assert('expected qp', qp);
        presentProp = qp.prop in queryParams && qp.prop || qp.scopedPropertyName in queryParams && qp.scopedPropertyName || qp.urlKey in queryParams && qp.urlKey;
        assert(`You passed the \`${presentProp}\` query parameter during a transition into ${qp.route.routeName}, please update to ${qp.urlKey}`, function () {
          if (qp.urlKey === presentProp || qp.scopedPropertyName === presentProp) {
            return true;
          }
          if (_fromRouterService && presentProp !== false && qp.urlKey !== qp.prop) {
            // assumptions (mainly from current transitionTo_test):
            // - this is only supposed to be run when there is an alias to a query param and the alias is used to set the param
            // - when there is no alias: qp.urlKey == qp.prop
            return false;
          }
          return true;
        }());
        if (presentProp) {
          if (presentProp !== qp.scopedPropertyName) {
            queryParams[qp.scopedPropertyName] = queryParams[presentProp];
            delete queryParams[presentProp];
          }
        } else {
          let cacheKey = calculateCacheKey(qp.route.fullRouteName, qp.parts, state.params);
          assert('ROUTER BUG: expected appCache to be defined. This is an internal bug, please open an issue on Github if you see this message!', appCache);
          queryParams[qp.scopedPropertyName] = appCache.lookup(cacheKey, qp.prop, qp.defaultValue);
        }
      }
    }
  }
  _scheduleLoadingEvent(transition, originRoute) {
    this._cancelSlowTransitionTimer();
    this._slowTransitionTimer = scheduleOnce('routerTransitions', this, this._handleSlowTransition, transition, originRoute);
  }
  _handleSlowTransition(transition, originRoute) {
    if (!this._routerMicrolib.activeTransition) {
      // Don't fire an event if we've since moved on from
      // the transition that put us in a loading state.
      return;
    }
    let targetState = new RouterState(this, this._routerMicrolib, this._routerMicrolib.activeTransition[STATE_SYMBOL]);
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
  _markErrorAsHandled(error) {
    this._handledErrors.add(error);
  }
  _isErrorHandled(error) {
    return this._handledErrors.has(error);
  }
  _clearHandledError(error) {
    this._handledErrors.delete(error);
  }
  _getEngineInstance({
    name,
    instanceId,
    mountPoint
  }) {
    let engineInstances = this._engineInstances;
    let namedInstances = engineInstances[name];
    if (!namedInstances) {
      namedInstances = Object.create(null);
      engineInstances[name] = namedInstances;
    }
    // We just set these!
    assert('has namedInstances', namedInstances);
    let engineInstance = namedInstances[instanceId];
    if (!engineInstance) {
      let owner = getOwner(this);
      assert('Expected router to have EngineInstance as owner', owner instanceof EngineInstance);
      assert(`You attempted to mount the engine '${name}' in your router map, but the engine can not be found.`, owner.hasRegistration(`engine:${name}`));
      engineInstance = owner.buildChildEngineInstance(name, {
        routable: true,
        mountPoint
      });
      engineInstance.boot();
      namedInstances[instanceId] = engineInstance;
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
function forEachRouteAbove(routeInfos, callback) {
  for (let i = routeInfos.length - 1; i >= 0; --i) {
    let routeInfo = routeInfos[i];
    assert('has routeInfo', routeInfo);
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
  willResolveModel(_routeInfos, transition, originRoute) {
    this._scheduleLoadingEvent(transition, originRoute);
  },
  // Attempt to find an appropriate error route or substate to enter.
  error(routeInfos, error, transition) {
    let router = this;
    let routeInfoWithError = routeInfos[routeInfos.length - 1];
    forEachRouteAbove(routeInfos, (route, routeInfo) => {
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
  loading(routeInfos, transition) {
    let router = this;
    let routeInfoWithSlowLoading = routeInfos[routeInfos.length - 1];
    forEachRouteAbove(routeInfos, (route, routeInfo) => {
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
      return transition.pivotHandler !== route;
    });
  }
};
function logError(_error, initialMessage) {
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
function findRouteSubstateName(route, state) {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);
  let {
    routeName,
    fullRouteName,
    _router: router
  } = route;
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
function findRouteStateName(route, state) {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);
  let {
    routeName,
    fullRouteName,
    _router: router
  } = route;
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
function routeHasBeenDefined(owner, router, localName, fullName) {
  let routerHasRoute = router.hasRoute(fullName);
  let ownerHasRoute = owner.factoryFor(`template:${localName}`) || owner.factoryFor(`route:${localName}`);
  return routerHasRoute && ownerHasRoute;
}
export function triggerEvent(routeInfos, ignoreFailure, name, args) {
  if (!routeInfos) {
    if (ignoreFailure) {
      return;
    }
    // TODO: update?
    throw new Error(`Can't trigger action '${name}' because your app hasn't finished transitioning into its first route. To trigger an action on destination routes during a transition, you can call \`.send()\` on the \`Transition\` object passed to the \`model/beforeModel/afterModel\` hooks.`);
  }
  let eventWasHandled = false;
  let routeInfo, handler, actionHandler;
  for (let i = routeInfos.length - 1; i >= 0; i--) {
    routeInfo = routeInfos[i];
    assert('[BUG] Missing routeInfo', routeInfo);
    handler = routeInfo.route;
    actionHandler = handler && handler.actions && handler.actions[name];
    if (actionHandler) {
      if (actionHandler.apply(handler, args) === true) {
        eventWasHandled = true;
      } else {
        // Should only hit here if a non-bubbling error action is triggered on a route.
        if (name === 'error') {
          assert('[BUG] Missing handler', handler);
          handler._router._markErrorAsHandled(args[0]);
        }
        return;
      }
    }
  }
  let defaultHandler = defaultActionHandlers[name];
  if (defaultHandler) {
    defaultHandler.call(this, routeInfos, ...args);
    return;
  }
  if (!eventWasHandled && !ignoreFailure) {
    throw new Error(`Nothing handled the action '${name}'. If you did handle the action, this error can be caused by returning true from an action handler in a controller, causing the action to bubble.`);
  }
}
function calculatePostTransitionState(emberRouter, leafRouteName, contexts) {
  let state = emberRouter._routerMicrolib.applyIntent(leafRouteName, contexts);
  let {
    routeInfos,
    params
  } = state;
  for (let routeInfo of routeInfos) {
    // If the routeInfo is not resolved, we serialize the context into params
    if (!routeInfo.isResolved) {
      params[routeInfo.name] = routeInfo.serialize(routeInfo.context);
    } else {
      params[routeInfo.name] = routeInfo.params;
    }
  }
  return state;
}
function updatePaths(router) {
  let infos = router._routerMicrolib.currentRouteInfos;
  if (infos.length === 0) {
    return;
  }
  let path = EmberRouter._routePath(infos);
  let info = infos[infos.length - 1];
  assert('expected info', info);
  let currentRouteName = info.name;
  let location = router.location;
  assert('expected location to not be a string', typeof location !== 'string');
  let currentURL = location.getURL();
  set(router, 'currentPath', path);
  set(router, 'currentRouteName', currentRouteName);
  set(router, 'currentURL', currentURL);
}
function didBeginTransition(transition, router) {
  let routerState = new RouterState(router, router._routerMicrolib, transition[STATE_SYMBOL]);
  if (!router.currentState) {
    router.set('currentState', routerState);
  }
  router.set('targetState', routerState);
  transition.promise = transition.catch(error => {
    if (router._isErrorHandled(error)) {
      router._clearHandledError(error);
    } else {
      throw error;
    }
  }, 'Transition Error');
}
function forEachQueryParam(router, routeInfos, queryParams, callback) {
  let qpCache = router._queryParamsFor(routeInfos);
  for (let key in queryParams) {
    if (!Object.prototype.hasOwnProperty.call(queryParams, key)) {
      continue;
    }
    let value = queryParams[key];
    let qp = qpCache.map[key];
    callback(key, value, qp);
  }
}
EmberRouter.reopen({
  didTransition: defaultDidTransition,
  willTransition: defaultWillTransition,
  rootURL: '/',
  location: 'hash',
  // FIXME: Does this need to be overrideable via extend?
  url: computed(function () {
    let location = get(this, 'location');
    if (typeof location === 'string') {
      return undefined;
    }
    return location.getURL();
  })
});
export default EmberRouter;