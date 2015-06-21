import Ember from 'ember-metal/core'; // FEATURES, Logger, assert
import isEnabled from 'ember-metal/features';
import EmberError from 'ember-metal/error';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { defineProperty } from 'ember-metal/properties';
import { computed } from 'ember-metal/computed';
import merge from 'ember-metal/merge';
import run from 'ember-metal/run_loop';
import { fmt } from 'ember-runtime/system/string';
import EmberObject from 'ember-runtime/system/object';
import Evented from 'ember-runtime/mixins/evented';
import EmberRouterDSL from 'ember-routing/system/dsl';
import EmberLocation from 'ember-routing/location/api';
import {
  routeArgs,
  getActiveTargetName,
  stashParamNames,
  calculateCacheKey
} from 'ember-routing/utils';
import RouterState from './router_state';

/**
@module ember
@submodule ember-routing
*/

import Router from 'router';
import 'router/transition';

function K() { return this; }

var slice = [].slice;

/**
  The `Ember.Router` class manages the application state and URLs. Refer to
  the [routing guide](http://emberjs.com/guides/routing/) for documentation.

  @class Router
  @namespace Ember
  @extends Ember.Object
  @uses Ember.Evented
  @public
*/
var EmberRouter = EmberObject.extend(Evented, {
  /**
    The `location` property determines the type of URL's that your
    application will use.

    The following location types are currently available:

    * `auto`
    * `hash`
    * `history`
    * `none`

    @property location
    @default 'hash'
    @see {Ember.Location}
    @public
  */
  location: 'hash',

  /**
   Represents the URL of the root of the application, often '/'. This prefix is
   assumed on all routes defined on this router.

   @property rootURL
   @default '/'
   @public
  */
  rootURL: '/',

  _initRouterJs(moduleBasedResolver) {
    var router = this.router = new Router();
    router.triggerEvent = triggerEvent;

    router._triggerWillChangeContext = K;
    router._triggerWillLeave = K;

    var dslCallbacks = this.constructor.dslCallbacks || [K];
    var dsl = new EmberRouterDSL(null, {
      enableLoadingSubstates: !!moduleBasedResolver
    });

    function generateDSL() {
      this.resource('application', { path: '/', overrideNameAssertion: true }, function() {
        for (var i=0; i < dslCallbacks.length; i++) {
          dslCallbacks[i].call(this);
        }
      });
    }

    generateDSL.call(dsl);

    if (get(this, 'namespace.LOG_TRANSITIONS_INTERNAL')) {
      router.log = Ember.Logger.debug;
    }

    router.map(dsl.generate());
  },

  init() {
    this._activeViews = {};
    this._qpCache = {};
    this._resetQueuedQueryParameterChanges();
  },

  /*
    Resets all pending query paramter changes.
    Called after transitioning to a new route
    based on query parameter changes.
  */
  _resetQueuedQueryParameterChanges() {
    this._queuedQPChanges = {};
  },

  /**
    Represents the current URL.

    @method url
    @return {String} The current URL.
    @private
  */
  url: computed(function() {
    return get(this, 'location').getURL();
  }),

  /**
    Initializes the current router instance and sets up the change handling
    event listeners used by the instances `location` implementation.

    A property named `initialURL` will be used to determine the initial URL.
    If no value is found `/` will be used.

    @method startRouting
    @private
  */
  startRouting(moduleBasedResolver) {
    var initialURL = get(this, 'initialURL');

    if (this.setupRouter(moduleBasedResolver)) {
      if (typeof initialURL === 'undefined') {
        initialURL = get(this, 'location').getURL();
      }
      var initialTransition = this.handleURL(initialURL);
      if (initialTransition && initialTransition.error) {
        throw initialTransition.error;
      }
    }
  },

  setupRouter(moduleBasedResolver) {
    this._initRouterJs(moduleBasedResolver);
    this._setupLocation();

    var router = this.router;
    var location = get(this, 'location');

    // Allow the Location class to cancel the router setup while it refreshes
    // the page
    if (get(location, 'cancelRouterSetup')) {
      return false;
    }

    this._setupRouter(router, location);

    location.onUpdateURL((url) => {
      this.handleURL(url);
    });

    return true;
  },

  /**
    Handles updating the paths and notifying any listeners of the URL
    change.

    Triggers the router level `didTransition` hook.

    @method didTransition
    @private
    @since 1.2.0
  */
  didTransition(infos) {
    updatePaths(this);

    this._cancelSlowTransitionTimer();

    this.notifyPropertyChange('url');
    this.set('currentState', this.targetState);

    // Put this in the runloop so url will be accurate. Seems
    // less surprising than didTransition being out of sync.
    run.once(this, this.trigger, 'didTransition');

    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log(`Transitioned into '${EmberRouter._routePath(infos)}'`);
    }
  },

  _setOutlets() {
    var handlerInfos = this.router.currentHandlerInfos;
    var route;
    var defaultParentState;
    var liveRoutes = null;

    if (!handlerInfos) {
      return;
    }

    for (var i = 0; i < handlerInfos.length; i++) {
      route = handlerInfos[i].handler;
      var connections = route.connections;
      var ownState;
      for (var j = 0; j < connections.length; j++) {
        var appended = appendLiveRoute(liveRoutes, defaultParentState, connections[j]);
        liveRoutes = appended.liveRoutes;
        if (appended.ownState.render.name === route.routeName || appended.ownState.render.outlet === 'main') {
          ownState = appended.ownState;
        }
      }
      if (connections.length === 0) {
        ownState = representEmptyRoute(liveRoutes, defaultParentState, route);
      }
      defaultParentState = ownState;
    }
    if (!this._toplevelView) {
      var OutletView = this.container.lookupFactory('view:-outlet');
      this._toplevelView = OutletView.create();
      var instance = this.container.lookup('-application-instance:main');
      instance.didCreateRootView(this._toplevelView);
    }
    this._toplevelView.setOutletState(liveRoutes);
  },

  /**
    Handles notifying any listeners of an impending URL
    change.

    Triggers the router level `willTransition` hook.

    @method willTransition
    @private
    @since 1.11.0
  */
  willTransition(oldInfos, newInfos, transition) {
    run.once(this, this.trigger, 'willTransition', transition);

    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log(`Preparing to transition from '${EmberRouter._routePath(oldInfos)}' to ' ${EmberRouter._routePath(newInfos)}'`);
    }
  },

  handleURL(url) {
    // Until we have an ember-idiomatic way of accessing #hashes, we need to
    // remove it because router.js doesn't know how to handle it.
    url = url.split(/#(.+)?/)[0];
    return this._doURLTransition('handleURL', url);
  },

  _doURLTransition(routerJsMethod, url) {
    var transition = this.router[routerJsMethod](url || '/');
    didBeginTransition(transition, this);
    return transition;
  },

  transitionTo(...args) {
    var queryParams;
    if (resemblesURL(args[0])) {
      return this._doURLTransition('transitionTo', args[0]);
    }

    var possibleQueryParams = args[args.length-1];
    if (possibleQueryParams && possibleQueryParams.hasOwnProperty('queryParams')) {
      queryParams = args.pop().queryParams;
    } else {
      queryParams = {};
    }

    var targetRouteName = args.shift();
    return this._doTransition(targetRouteName, args, queryParams);
  },

  intermediateTransitionTo() {
    this.router.intermediateTransitionTo(...arguments);

    updatePaths(this);

    var infos = this.router.currentHandlerInfos;
    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log(`Intermediate-transitioned into '${EmberRouter._routePath(infos)}'`);
    }
  },

  replaceWith() {
    return this.transitionTo(...arguments).method('replace');
  },

  generate() {
    var url = this.router.generate(...arguments);
    return this.location.formatURL(url);
  },

  /**
    Determines if the supplied route is currently active.

    @method isActive
    @param routeName
    @return {Boolean}
    @private
  */
  isActive(routeName) {
    var router = this.router;
    return router.isActive(...arguments);
  },

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
  },

  send(name, context) {
    this.router.trigger(...arguments);
  },

  /**
    Does this router instance have the given route.

    @method hasRoute
    @return {Boolean}
    @private
  */
  hasRoute(route) {
    return this.router.hasRoute(route);
  },

  /**
    Resets the state of the router by clearing the current route
    handlers and deactivating them.

    @private
    @method reset
   */
  reset() {
    if (this.router) {
      this.router.reset();
    }
  },

  willDestroy() {
    if (this._toplevelView) {
      this._toplevelView.destroy();
      this._toplevelView = null;
    }
    this._super(...arguments);
    this.reset();
  },

  _lookupActiveComponentNode(templateName) {
    return this._activeViews[templateName];
  },

  /*
    Called when an active route's query parameter has changed.
    These changes are batched into a runloop run and trigger
    a single transition.
  */
  _activeQPChanged(queryParameterName, newValue) {
    this._queuedQPChanges[queryParameterName] = newValue;
    run.once(this, this._fireQueryParamTransition);
  },

  _updatingQPChanged(queryParameterName) {
    if (!this._qpUpdates) {
      this._qpUpdates = {};
    }
    this._qpUpdates[queryParameterName] = true;
  },

  /*
    Triggers a transition to a route based on query parameter changes.
    This is called once per runloop, to batch changes.

    e.g.

    if these methods are called in succession:
    this._activeQPChanged('foo', '10');
      // results in _queuedQPChanges = {foo: '10'}
    this._activeQPChanged('bar', false);
      // results in _queuedQPChanges = {foo: '10', bar: false}


    _queuedQPChanges will represent both of these changes
    and the transition using `transitionTo` will be triggered
    once.
  */
  _fireQueryParamTransition() {
    this.transitionTo({ queryParams: this._queuedQPChanges });
    this._resetQueuedQueryParameterChanges();
  },

  _connectActiveComponentNode(templateName, componentNode) {
    Ember.assert('cannot connect an activeView that already exists', !this._activeViews[templateName]);

    var _activeViews = this._activeViews;
    function disconnectActiveView() {
      delete _activeViews[templateName];
    }

    this._activeViews[templateName] = componentNode;
    componentNode.renderNode.addDestruction({ destroy: disconnectActiveView });
  },

  _setupLocation() {
    var location = get(this, 'location');
    var rootURL = get(this, 'rootURL');

    if ('string' === typeof location && this.container) {
      var resolvedLocation = this.container.lookup(`location:${location}`);

      if ('undefined' !== typeof resolvedLocation) {
        location = set(this, 'location', resolvedLocation);
      } else {
        // Allow for deprecated registration of custom location API's
        var options = {
          implementation: location
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
  },

  _getHandlerFunction() {
    var seen = Object.create(null);
    var container = this.container;
    var DefaultRoute = container.lookupFactory('route:basic');

    return (name) => {
      var routeName = 'route:' + name;
      var handler = container.lookup(routeName);

      if (seen[name]) {
        return handler;
      }

      seen[name] = true;

      if (!handler) {
        container._registry.register(routeName, DefaultRoute.extend());
        handler = container.lookup(routeName);

        if (get(this, 'namespace.LOG_ACTIVE_GENERATION')) {
          Ember.Logger.info(`generated -> ${routeName}`, { fullName: routeName });
        }
      }

      handler.routeName = name;
      return handler;
    };
  },

  _setupRouter(router, location) {
    var lastURL;
    var emberRouter = this;

    router.getHandler = this._getHandlerFunction();

    var doUpdateURL = function() {
      location.setURL(lastURL);
    };

    router.updateURL = function(path) {
      lastURL = path;
      run.once(doUpdateURL);
    };

    if (location.replaceURL) {
      var doReplaceURL = function() {
        location.replaceURL(lastURL);
      };

      router.replaceURL = function(path) {
        lastURL = path;
        run.once(doReplaceURL);
      };
    }

    router.didTransition = function(infos) {
      emberRouter.didTransition(infos);
    };

    if (isEnabled('ember-router-willtransition')) {
      router.willTransition = function(oldInfos, newInfos, transition) {
        emberRouter.willTransition(oldInfos, newInfos, transition);
      };
    }
  },

  _serializeQueryParams(targetRouteName, queryParams) {
    var groupedByUrlKey = {};

    forEachQueryParam(this, targetRouteName, queryParams, function(key, value, qp) {
      var urlKey = qp.urlKey;
      if (!groupedByUrlKey[urlKey]) {
        groupedByUrlKey[urlKey] = [];
      }
      groupedByUrlKey[urlKey].push({
        qp: qp,
        value: value
      });
      delete queryParams[key];
    });

    for (var key in groupedByUrlKey) {
      var qps = groupedByUrlKey[key];
      Ember.assert(fmt('You\'re not allowed to have more than one controller ' +
                       'property map to the same query param key, but both ' +
                       '`%@` and `%@` map to `%@`. You can fix this by mapping ' +
                       'one of the controller properties to a different query ' +
                       'param key via the `as` config option, e.g. `%@: { as: \'other-%@\' }`',
                       [qps[0].qp.scopedPropertyName, qps[1] ? qps[1].qp.scopedPropertyName : '', qps[0].qp.urlKey, qps[0].qp.prop, qps[0].qp.prop]), qps.length <= 1);
      var qp = qps[0].qp;
      queryParams[qp.urlKey] = qp.route.serializeQueryParam(qps[0].value, qp.urlKey, qp.type);
    }
  },

  _deserializeQueryParams(targetRouteName, queryParams) {
    forEachQueryParam(this, targetRouteName, queryParams, function(key, value, qp) {
      delete queryParams[key];
      queryParams[qp.prop] = qp.route.deserializeQueryParam(value, qp.urlKey, qp.type);
    });
  },

  _pruneDefaultQueryParamValues(targetRouteName, queryParams) {
    var qps = this._queryParamsFor(targetRouteName);
    for (var key in queryParams) {
      var qp = qps.map[key];
      if (qp && qp.serializedDefaultValue === queryParams[key]) {
        delete queryParams[key];
      }
    }
  },

  _doTransition(_targetRouteName, models, _queryParams) {
    var targetRouteName = _targetRouteName || getActiveTargetName(this.router);
    Ember.assert(`The route ${targetRouteName} was not found`, targetRouteName && this.router.hasRoute(targetRouteName));

    var queryParams = {};
    merge(queryParams, _queryParams);
    this._prepareQueryParams(targetRouteName, models, queryParams);

    var transitionArgs = routeArgs(targetRouteName, models, queryParams);
    var transitionPromise = this.router.transitionTo.apply(this.router, transitionArgs);

    didBeginTransition(transitionPromise, this);

    return transitionPromise;
  },

  _prepareQueryParams(targetRouteName, models, queryParams) {
    this._hydrateUnsuppliedQueryParams(targetRouteName, models, queryParams);
    this._serializeQueryParams(targetRouteName, queryParams);
    this._pruneDefaultQueryParamValues(targetRouteName, queryParams);
  },

  /**
    Returns a merged query params meta object for a given route.
    Useful for asking a route what its known query params are.

    @private
   */
  _queryParamsFor(leafRouteName) {
    if (this._qpCache[leafRouteName]) {
      return this._qpCache[leafRouteName];
    }

    var map = {};
    var qps = [];
    this._qpCache[leafRouteName] = {
      map: map,
      qps: qps
    };

    var routerjs = this.router;
    var recogHandlerInfos = routerjs.recognizer.handlersFor(leafRouteName);

    for (var i = 0, len = recogHandlerInfos.length; i < len; ++i) {
      var recogHandler = recogHandlerInfos[i];
      var route = routerjs.getHandler(recogHandler.handler);
      var qpMeta = get(route, '_qp');

      if (!qpMeta) { continue; }

      merge(map, qpMeta.map);
      qps.push.apply(qps, qpMeta.qps);
    }

    return {
      qps: qps,
      map: map
    };
  },

  _hydrateUnsuppliedQueryParams(leafRouteName, contexts, queryParams) {
    var state = calculatePostTransitionState(this, leafRouteName, contexts);
    var handlerInfos = state.handlerInfos;
    var appCache = this._bucketCache;
    stashParamNames(this, handlerInfos);

    for (var i = 0, len = handlerInfos.length; i < len; ++i) {
      var route = handlerInfos[i].handler;
      var qpMeta = get(route, '_qp');

      for (var j = 0, qpLen = qpMeta.qps.length; j < qpLen; ++j) {
        var qp = qpMeta.qps[j];

        var presentProp = qp.prop in queryParams  && qp.prop ||
                          qp.scopedPropertyName in queryParams && qp.scopedPropertyName;

        if (presentProp) {
          if (presentProp !== qp.scopedPropertyName) {
            queryParams[qp.scopedPropertyName] = queryParams[presentProp];
            delete queryParams[presentProp];
          }
        } else {
          var cacheKey = calculateCacheKey(qp.ctrl, qp.parts, state.params);
          queryParams[qp.scopedPropertyName] = appCache.lookup(cacheKey, qp.prop, qp.defaultValue);
        }
      }
    }
  },

  _scheduleLoadingEvent(transition, originRoute) {
    this._cancelSlowTransitionTimer();
    this._slowTransitionTimer = run.scheduleOnce('routerTransitions', this, '_handleSlowTransition', transition, originRoute);
  },

  currentState: null,
  targetState: null,

  _handleSlowTransition(transition, originRoute) {
    if (!this.router.activeTransition) {
      // Don't fire an event if we've since moved on from
      // the transition that put us in a loading state.
      return;
    }

    this.set('targetState', RouterState.create({
      emberRouter: this,
      routerJs: this.router,
      routerJsState: this.router.activeTransition.state
    }));

    transition.trigger(true, 'loading', transition, originRoute);
  },

  _cancelSlowTransitionTimer() {
    if (this._slowTransitionTimer) {
      run.cancel(this._slowTransitionTimer);
    }
    this._slowTransitionTimer = null;
  }
});

/*
  Helper function for iterating root-ward, starting
  from (but not including) the provided `originRoute`.

  Returns true if the last callback fired requested
  to bubble upward.

  @private
 */
function forEachRouteAbove(originRoute, transition, callback) {
  var handlerInfos = transition.state.handlerInfos;
  var originRouteFound = false;
  var handlerInfo, route;

  for (var i = handlerInfos.length - 1; i >= 0; --i) {
    handlerInfo = handlerInfos[i];
    route = handlerInfo.handler;

    if (!originRouteFound) {
      if (originRoute === route) {
        originRouteFound = true;
      }
      continue;
    }

    if (callback(route, handlerInfos[i + 1].handler) !== true) {
      return false;
    }
  }
  return true;
}

// These get invoked when an action bubbles above ApplicationRoute
// and are not meant to be overridable.
var defaultActionHandlers = {

  willResolveModel(transition, originRoute) {
    originRoute.router._scheduleLoadingEvent(transition, originRoute);
  },

  error(error, transition, originRoute) {
    // Attempt to find an appropriate error substate to enter.
    var router = originRoute.router;

    var tryTopLevel = forEachRouteAbove(originRoute, transition, function(route, childRoute) {
      var childErrorRouteName = findChildRouteName(route, childRoute, 'error');
      if (childErrorRouteName) {
        router.intermediateTransitionTo(childErrorRouteName, error);
        return;
      }
      return true;
    });

    if (tryTopLevel) {
      // Check for top-level error state to enter.
      if (routeHasBeenDefined(originRoute.router, 'application_error')) {
        router.intermediateTransitionTo('application_error', error);
        return;
      }
    }

    logError(error, 'Error while processing route: ' + transition.targetName);
  },

  loading(transition, originRoute) {
    // Attempt to find an appropriate loading substate to enter.
    var router = originRoute.router;

    var tryTopLevel = forEachRouteAbove(originRoute, transition, function(route, childRoute) {
      var childLoadingRouteName = findChildRouteName(route, childRoute, 'loading');

      if (childLoadingRouteName) {
        router.intermediateTransitionTo(childLoadingRouteName);
        return;
      }

      // Don't bubble above pivot route.
      if (transition.pivotHandler !== route) {
        return true;
      }
    });

    if (tryTopLevel) {
      // Check for top-level loading state to enter.
      if (routeHasBeenDefined(originRoute.router, 'application_loading')) {
        router.intermediateTransitionTo('application_loading');
        return;
      }
    }
  }
};

function logError(_error, initialMessage) {
  var errorArgs = [];
  var error;
  if (_error && typeof _error === 'object' && typeof _error.errorThrown === 'object') {
    error = _error.errorThrown;
  } else {
    error = _error;
  }

  if (initialMessage) { errorArgs.push(initialMessage); }

  if (error) {
    if (error.message) { errorArgs.push(error.message); }
    if (error.stack) { errorArgs.push(error.stack); }

    if (typeof error === 'string') { errorArgs.push(error); }
  }

  Ember.Logger.error.apply(this, errorArgs);
}

function findChildRouteName(parentRoute, originatingChildRoute, name) {
  var router = parentRoute.router;
  var childName;
  var targetChildRouteName = originatingChildRoute.routeName.split('.').pop();
  var namespace = parentRoute.routeName === 'application' ? '' : parentRoute.routeName + '.';

  if (isEnabled('ember-routing-named-substates')) {
    // First, try a named loading state, e.g. 'foo_loading'
    childName = namespace + targetChildRouteName + '_' + name;
    if (routeHasBeenDefined(router, childName)) {
      return childName;
    }
  }

  // Second, try general loading state, e.g. 'loading'
  childName = namespace + name;
  if (routeHasBeenDefined(router, childName)) {
    return childName;
  }
}

function routeHasBeenDefined(router, name) {
  var container = router.container;
  return router.hasRoute(name) &&
         (container._registry.has(`template:${name}`) || container._registry.has(`route:${name}`));
}

function triggerEvent(handlerInfos, ignoreFailure, args) {
  var name = args.shift();

  if (!handlerInfos) {
    if (ignoreFailure) { return; }
    throw new EmberError(`Can't trigger action '${name}' because your app hasn't finished transitioning into its first route. To trigger an action on destination routes during a transition, you can call \`.send()\` on the \`Transition\` object passed to the \`model/beforeModel/afterModel\` hooks.`);
  }

  var eventWasHandled = false;
  var handlerInfo, handler;

  for (var i = handlerInfos.length - 1; i >= 0; i--) {
    handlerInfo = handlerInfos[i];
    handler = handlerInfo.handler;

    if (handler._actions && handler._actions[name]) {
      if (handler._actions[name].apply(handler, args) === true) {
        eventWasHandled = true;
      } else {
        return;
      }
    }
  }

  if (defaultActionHandlers[name]) {
    defaultActionHandlers[name].apply(null, args);
    return;
  }

  if (!eventWasHandled && !ignoreFailure) {
    throw new EmberError(`Nothing handled the action '${name}'. If you did handle the action, this error can be caused by returning true from an action handler in a controller, causing the action to bubble.`);
  }
}

function calculatePostTransitionState(emberRouter, leafRouteName, contexts) {
  var routerjs = emberRouter.router;
  var state = routerjs.applyIntent(leafRouteName, contexts);
  var handlerInfos = state.handlerInfos;
  var params = state.params;

  for (var i = 0, len = handlerInfos.length; i < len; ++i) {
    var handlerInfo = handlerInfos[i];
    if (!handlerInfo.isResolved) {
      handlerInfo = handlerInfo.becomeResolved(null, handlerInfo.context);
    }
    params[handlerInfo.name] = handlerInfo.params;
  }
  return state;
}

function updatePaths(router) {
  var appController = router.container.lookup('controller:application');

  if (!appController) {
    // appController might not exist when top-level loading/error
    // substates have been entered since ApplicationRoute hasn't
    // actually been entered at that point.
    return;
  }

  var infos = router.router.currentHandlerInfos;
  var path = EmberRouter._routePath(infos);

  if (!('currentPath' in appController)) {
    defineProperty(appController, 'currentPath');
  }

  set(appController, 'currentPath', path);
  set(router, 'currentPath', path);

  if (!('currentRouteName' in appController)) {
    defineProperty(appController, 'currentRouteName');
  }

  set(appController, 'currentRouteName', infos[infos.length - 1].name);
  set(router, 'currentRouteName', infos[infos.length - 1].name);
}

EmberRouter.reopenClass({
  router: null,

  /**
    The `Router.map` function allows you to define mappings from URLs to routes
    and resources in your application. These mappings are defined within the
    supplied callback function using `this.resource` and `this.route`.

    ```javascript
    App.Router.map(function(){
      this.route('about');
      this.resource('article');
    });
    ```

    For more detailed examples please see
    [the guides](http://emberjs.com/guides/routing/defining-your-routes/).

    @method map
    @param callback
    @public
  */
  map(callback) {

    if (!this.dslCallbacks) {
      this.dslCallbacks = [];
      this.reopenClass({ dslCallbacks: this.dslCallbacks });
    }

    this.dslCallbacks.push(callback);

    return this;
  },

  _routePath(handlerInfos) {
    var path = [];

    // We have to handle coalescing resource names that
    // are prefixed with their parent's names, e.g.
    // ['foo', 'foo.bar.baz'] => 'foo.bar.baz', not 'foo.foo.bar.baz'

    function intersectionMatches(a1, a2) {
      for (var i = 0, len = a1.length; i < len; ++i) {
        if (a1[i] !== a2[i]) {
          return false;
        }
      }
      return true;
    }

    var name, nameParts, oldNameParts;
    for (var i=1, l=handlerInfos.length; i<l; i++) {
      name = handlerInfos[i].name;
      nameParts = name.split('.');
      oldNameParts = slice.call(path);

      while (oldNameParts.length) {
        if (intersectionMatches(oldNameParts, nameParts)) {
          break;
        }
        oldNameParts.shift();
      }

      path.push.apply(path, nameParts.slice(oldNameParts.length));
    }

    return path.join('.');
  }
});

function didBeginTransition(transition, router) {
  var routerState = RouterState.create({
    emberRouter: router,
    routerJs: router.router,
    routerJsState: transition.state
  });

  if (!router.currentState) {
    router.set('currentState', routerState);
  }
  router.set('targetState', routerState);

  transition.then(null, function(error) {
    if (!error || !error.name) { return; }

    Ember.assert(`The URL '${error.message}' did not match any routes in your application`, error.name !== 'UnrecognizedURLError');

    return error;
  }, 'Ember: Process errors from Router');
}

function resemblesURL(str) {
  return typeof str === 'string' && ( str === '' || str.charAt(0) === '/');
}

function forEachQueryParam(router, targetRouteName, queryParams, callback) {
  var qpCache = router._queryParamsFor(targetRouteName);

  for (var key in queryParams) {
    if (!queryParams.hasOwnProperty(key)) { continue; }
    var value = queryParams[key];
    var qp = qpCache.map[key];

    if (qp) {
      callback(key, value, qp);
    }
  }
}

function findLiveRoute(liveRoutes, name) {
  if (!liveRoutes) { return; }
  var stack = [liveRoutes];
  while (stack.length > 0) {
    var test = stack.shift();
    if (test.render.name === name) {
      return test;
    }
    var outlets = test.outlets;
    for (var outletName in outlets) {
      stack.push(outlets[outletName]);
    }
  }
}

function appendLiveRoute(liveRoutes, defaultParentState, renderOptions) {
  var target;
  var myState = {
    render: renderOptions,
    outlets: Object.create(null)
  };
  if (renderOptions.into) {
    target = findLiveRoute(liveRoutes, renderOptions.into);
  } else {
    target = defaultParentState;
  }
  if (target) {
    set(target.outlets, renderOptions.outlet, myState);
  } else {
    if (renderOptions.into) {
      // Megahax time. Post-2.0-breaking-changes, we will just assert
      // right here that the user tried to target a nonexistent
      // thing. But for now we still need to support the `render`
      // helper, and people are allowed to target templates rendered
      // by the render helper. So instead we defer doing anyting with
      // these orphan renders until afterRender.
      appendOrphan(liveRoutes, renderOptions.into, myState);
    } else {
      liveRoutes = myState;
    }
  }
  return {
    liveRoutes: liveRoutes,
    ownState: myState
  };
}

function appendOrphan(liveRoutes, into, myState) {
  if (!liveRoutes.outlets.__ember_orphans__) {
    liveRoutes.outlets.__ember_orphans__ = {
      render: {
        name: '__ember_orphans__'
      },
      outlets: Object.create(null)
    };
  }
  liveRoutes.outlets.__ember_orphans__.outlets[into] = myState;
  Ember.run.schedule('afterRender', function() {
    // `wasUsed` gets set by the render helper. See the function
    // `impersonateAnOutlet`.
    Ember.assert('You attempted to render into \'' + into + '\' but it was not found',
                 liveRoutes.outlets.__ember_orphans__.outlets[into].wasUsed);
  });
}

function representEmptyRoute(liveRoutes, defaultParentState, route) {
  // the route didn't render anything
  var alreadyAppended = findLiveRoute(liveRoutes, route.routeName);
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
        outlet: 'main'
      },
      outlets: {}
    };
    return defaultParentState;
  }
}

export default EmberRouter;
