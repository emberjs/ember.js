import {
  assign,
  guidFor,
  dictionary,
  getOwner
} from 'ember-utils';
import Logger from 'ember-console';
import {
  assert,
  info,
  Error as EmberError,
  get,
  set,
  defineProperty,
  computed,
  run,
  runInDebug,
  deprecate,
  deprecateProperty
} from 'ember-metal';
import {
  Object as EmberObject,
  Evented,
  typeOf,
  A as emberA
} from 'ember-runtime';
import {
  defaultSerialize,
  hasDefaultSerialize
} from './route';
import EmberRouterDSL from './dsl';
import EmberLocation from '../location/api';
import {
  routeArgs,
  getActiveTargetName,
  calculateCacheKey
} from '../utils';
import RouterState from './router_state';
import { FACTORY_FOR } from 'container';

/**
@module ember
@submodule ember-routing
*/

import Router from 'router';

function K() { return this; }

const { slice } = Array.prototype;


/**
  The `Ember.Router` class manages the application state and URLs. Refer to
  the [routing guide](http://emberjs.com/guides/routing/) for documentation.

  @class Router
  @namespace Ember
  @extends Ember.Object
  @uses Ember.Evented
  @public
*/
const EmberRouter = EmberObject.extend(Evented, {
  /**
    The `location` property determines the type of URL's that your
    application will use.

    The following location types are currently available:

    * `history` - use the browser's history API to make the URLs look just like any standard URL
    * `hash` - use `#` to separate the server part of the URL from the Ember part: `/blog/#/posts/new`
    * `none` - do not store the Ember URL in the actual browser URL (mainly used for testing)
    * `auto` - use the best option based on browser capabilites: `history` if possible, then `hash` if possible, otherwise `none`

    Note: If using ember-cli, this value is defaulted to `auto` by the `locationType` setting of `/config/environment.js`

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

  _initRouterJs() {
    let routerMicrolib = this._routerMicrolib = new Router();
    routerMicrolib.triggerEvent = triggerEvent;

    routerMicrolib._triggerWillChangeContext = K;
    routerMicrolib._triggerWillLeave = K;

    let dslCallbacks = this.constructor.dslCallbacks || [K];
    let dsl = this._buildDSL();

    dsl.route('application', { path: '/', resetNamespace: true, overrideNameAssertion: true }, function() {
      for (let i = 0; i < dslCallbacks.length; i++) {
        dslCallbacks[i].call(this);
      }
    });

    runInDebug(() => {
      if (get(this, 'namespace.LOG_TRANSITIONS_INTERNAL')) {
        routerMicrolib.log = Logger.debug;
      }
    });

    routerMicrolib.map(dsl.generate());
  },

  _buildDSL() {
    let moduleBasedResolver = this._hasModuleBasedResolver();
    let options = {
      enableLoadingSubstates: !!moduleBasedResolver
    };

    let owner = getOwner(this);
    let router = this;

    options.resolveRouteMap = name => owner[FACTORY_FOR](`route-map:${name}`);

    options.addRouteForEngine = (name, engineInfo) => {
      if (!router._engineInfoByRoute[name]) {
        router._engineInfoByRoute[name] = engineInfo;
      }
    };

    return new EmberRouterDSL(null, options);
  },

  init() {
    this._super(...arguments);

    this.currentURL = null;
    this.currentRouteName = null;
    this.currentPath = null;

    this._qpCache = Object.create(null);
    this._resetQueuedQueryParameterChanges();
    this._handledErrors = dictionary(null);
    this._engineInstances = Object.create(null);
    this._engineInfoByRoute = Object.create(null)
  },

  /*
    Resets all pending query parameter changes.
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

  _hasModuleBasedResolver() {
    let owner = getOwner(this);

    if (!owner) { return false; }

    let resolver = owner.application && owner.application.__registry__ && owner.application.__registry__.resolver;

    if (!resolver) { return false; }

    return !!resolver.moduleBasedResolver;
  },

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
      if (typeof initialURL === 'undefined') {
        initialURL = get(this, 'location').getURL();
      }
      let initialTransition = this.handleURL(initialURL);
      if (initialTransition && initialTransition.error) {
        throw initialTransition.error;
      }
    }
  },

  setupRouter() {
    this._initRouterJs();
    this._setupLocation();

    let location = get(this, 'location');

    // Allow the Location class to cancel the router setup while it refreshes
    // the page
    if (get(location, 'cancelRouterSetup')) {
      return false;
    }

    this._setupRouter(location);

    location.onUpdateURL(url => {
      this.handleURL(url);
    });

    return true;
  },

  /**
    Handles updating the paths and notifying any listeners of the URL
    change.

    Triggers the router level `didTransition` hook.

    For example, to notify google analytics when the route changes,
    you could use this hook.  (Note: requires also including GA scripts, etc.)

    ```javascript
    let Router = Ember.Router.extend({
      location: config.locationType,

      didTransition: function() {
        this._super(...arguments);

        return ga('send', 'pageview', {
          'page': this.get('url'),
          'title': this.get('url')
        });
      }
    });
    ```

    @method didTransition
    @public
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

    runInDebug(() => {
      if (get(this, 'namespace').LOG_TRANSITIONS) {
        Logger.log(`Transitioned into '${EmberRouter._routePath(infos)}'`);
      }
    });
  },

  _setOutlets() {
    // This is triggered async during Ember.Route#willDestroy.
    // If the router is also being destroyed we do not want to
    // to create another this._toplevelView (and leak the renderer)
    if (this.isDestroying || this.isDestroyed) { return; }

    let handlerInfos = this._routerMicrolib.currentHandlerInfos;
    let route;
    let defaultParentState;
    let liveRoutes = null;

    if (!handlerInfos) {
      return;
    }

    for (let i = 0; i < handlerInfos.length; i++) {
      route = handlerInfos[i].handler;
      let connections = route.connections;
      let ownState;
      for (let j = 0; j < connections.length; j++) {
        let appended = appendLiveRoute(liveRoutes, defaultParentState, connections[j]);
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
      let OutletView = owner[FACTORY_FOR]('view:-outlet');
      this._toplevelView = OutletView.create();
      this._toplevelView.setOutletState(liveRoutes);
      let instance = owner.lookup('-application-instance:main');
      instance.didCreateRootView(this._toplevelView);
    } else {
      this._toplevelView.setOutletState(liveRoutes);
    }
  },

  /**
    Handles notifying any listeners of an impending URL
    change.

    Triggers the router level `willTransition` hook.

    @method willTransition
    @public
    @since 1.11.0
  */
  willTransition(oldInfos, newInfos, transition) {
    run.once(this, this.trigger, 'willTransition', transition);

    runInDebug(() => {
      if (get(this, 'namespace').LOG_TRANSITIONS) {
        Logger.log(`Preparing to transition from '${EmberRouter._routePath(oldInfos)}' to '${EmberRouter._routePath(newInfos)}'`);
      }
    });
  },

  handleURL(url) {
    // Until we have an ember-idiomatic way of accessing #hashes, we need to
    // remove it because router.js doesn't know how to handle it.
    url = url.split(/#(.+)?/)[0];
    return this._doURLTransition('handleURL', url);
  },

  _doURLTransition(routerJsMethod, url) {
    let transition = this._routerMicrolib[routerJsMethod](url || '/');
    didBeginTransition(transition, this);
    return transition;
  },

  /**
    Transition the application into another route. The route may
    be either a single route or route path:

    See [Route.transitionTo](http://emberjs.com/api/classes/Ember.Route.html#method_transitionTo) for more info.

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
  transitionTo(...args) {
    let queryParams;
    if (resemblesURL(args[0])) {
      return this._doURLTransition('transitionTo', args[0]);
    }

    let possibleQueryParams = args[args.length - 1];
    if (possibleQueryParams && possibleQueryParams.hasOwnProperty('queryParams')) {
      queryParams = args.pop().queryParams;
    } else {
      queryParams = {};
    }

    let targetRouteName = args.shift();
    return this._doTransition(targetRouteName, args, queryParams);
  },

  intermediateTransitionTo() {
    this._routerMicrolib.intermediateTransitionTo(...arguments);

    updatePaths(this);

    runInDebug(() => {
      let infos = this._routerMicrolib.currentHandlerInfos;
      if (get(this, 'namespace').LOG_TRANSITIONS) {
        Logger.log(`Intermediate-transitioned into '${EmberRouter._routePath(infos)}'`);
      }
    });
  },

  replaceWith() {
    return this.transitionTo(...arguments).method('replace');
  },

  generate() {
    let url = this._routerMicrolib.generate(...arguments);
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
    return this._routerMicrolib.isActive(...arguments);
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
    this._routerMicrolib.trigger(...arguments);
  },

  /**
    Does this router instance have the given route.

    @method hasRoute
    @return {Boolean}
    @private
  */
  hasRoute(route) {
    return this._routerMicrolib.hasRoute(route);
  },

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
  },

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
  },

  _setupLocation() {
    let location = get(this, 'location');
    let rootURL = get(this, 'rootURL');
    let owner = getOwner(this);

    if ('string' === typeof location && owner) {
      let resolvedLocation = owner.lookup(`location:${location}`);

      if ('undefined' !== typeof resolvedLocation) {
        location = set(this, 'location', resolvedLocation);
      } else {
        // Allow for deprecated registration of custom location API's
        let options = {
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
    let seen = Object.create(null);
    let owner = getOwner(this);

    return name => {
      let routeName = name;
      let routeOwner = owner;
      let engineInfo = this._engineInfoByRoute[routeName];

      if (engineInfo) {
        let engineInstance = this._getEngineInstance(engineInfo);

        routeOwner = engineInstance;
        routeName = engineInfo.localFullName;
      }

      let fullRouteName = `route:${routeName}`;

      let handler = routeOwner.lookup(fullRouteName);

      if (seen[name]) {
        return handler;
      }

      seen[name] = true;

      if (!handler) {
        let DefaultRoute = routeOwner[FACTORY_FOR]('route:basic').class;
        routeOwner.register(fullRouteName, DefaultRoute.extend());
        handler = routeOwner.lookup(fullRouteName);

        runInDebug(() => {
          if (get(this, 'namespace.LOG_ACTIVE_GENERATION')) {
            info(`generated -> ${fullRouteName}`, { fullName: fullRouteName });
          }
        });
      }

      handler._setRouteName(routeName);

      if (engineInfo && !hasDefaultSerialize(handler)) {
        throw new Error('Defining a custom serialize method on an Engine route is not supported.');
      }

      return handler;
    };
  },

  _getSerializerFunction() {
    return name => {
      let engineInfo = this._engineInfoByRoute[name];

      // If this is not an Engine route, we fall back to the handler for serialization
      if (!engineInfo) {
        return;
      }

      return engineInfo.serializeMethod || defaultSerialize;
    };
  },

  _setupRouter(location) {
    let lastURL;
    let emberRouter = this;
    let routerMicrolib = this._routerMicrolib;

    routerMicrolib.getHandler = this._getHandlerFunction();
    routerMicrolib.getSerializer = this._getSerializerFunction();

    let doUpdateURL = () => {
      location.setURL(lastURL);
      set(emberRouter, 'currentURL', lastURL);
    };

    routerMicrolib.updateURL = path => {
      lastURL = path;
      run.once(doUpdateURL);
    };

    if (location.replaceURL) {
      let doReplaceURL = () => {
        location.replaceURL(lastURL);
        set(emberRouter, 'currentURL', lastURL);
      };

      routerMicrolib.replaceURL = path => {
        lastURL = path;
        run.once(doReplaceURL);
      };
    }

    routerMicrolib.didTransition = infos => {
      emberRouter.didTransition(infos);
    };

    routerMicrolib.willTransition = (oldInfos, newInfos, transition) => {
      emberRouter.willTransition(oldInfos, newInfos, transition);
    };
  },

  /**
    Serializes the given query params according to their QP meta information.

    @private
    @method _serializeQueryParams
    @param {Arrray<HandlerInfo>} handlerInfos
    @param {Object} queryParams
    @return {Void}
  */
  _serializeQueryParams(handlerInfos, queryParams) {
    forEachQueryParam(this, handlerInfos, queryParams, (key, value, qp) => {
      if (qp) {
        delete queryParams[key];
        queryParams[qp.urlKey] = qp.route.serializeQueryParam(value, qp.urlKey, qp.type);
      } else if (value === undefined) {
        return; // We don't serialize undefined values
      } else {
        queryParams[key] = this._serializeQueryParam(value, typeOf(value));
      }
    });
  },

  /**
    Serializes the value of a query parameter based on a type

    @private
    @method _serializeQueryParam
    @param {Object} value
    @param {String} type
  */
  _serializeQueryParam(value, type) {
    if (type === 'array') {
      return JSON.stringify(value);
    }

    return `${value}`;
  },

  /**
    Deserializes the given query params according to their QP meta information.

    @private
    @method _deserializeQueryParams
    @param {Array<HandlerInfo>} handlerInfos
    @param {Object} queryParams
    @return {Void}
  */
  _deserializeQueryParams(handlerInfos, queryParams) {
    forEachQueryParam(this, handlerInfos, queryParams, (key, value, qp) => {
      // If we don't have QP meta info for a given key, then we do nothing
      // because all values will be treated as strings
      if (qp) {
        delete queryParams[key];
        queryParams[qp.prop] = qp.route.deserializeQueryParam(value, qp.urlKey, qp.type);
      }
    });
  },

  /**
    Deserializes the value of a query parameter based on a default type

    @private
    @method _deserializeQueryParam
    @param {Object} value
    @param {String} defaultType
  */
  _deserializeQueryParam(value, defaultType) {
    if (defaultType === 'boolean') {
      return (value === 'true') ? true : false;
    } else if (defaultType === 'number') {
      return (Number(value)).valueOf();
    } else if (defaultType === 'array') {
      return emberA(JSON.parse(value));
    }

    return value;
  },

  /**
    Removes (prunes) any query params with default values from the given QP
    object. Default values are determined from the QP meta information per key.

    @private
    @method _pruneDefaultQueryParamValues
    @param {Array<HandlerInfo>} handlerInfos
    @param {Object} queryParams
    @return {Void}
  */
  _pruneDefaultQueryParamValues(handlerInfos, queryParams) {
    let qps = this._queryParamsFor(handlerInfos);
    for (let key in queryParams) {
      let qp = qps.map[key];
      if (qp && qp.serializedDefaultValue === queryParams[key]) {
        delete queryParams[key];
      }
    }
  },

  _doTransition(_targetRouteName, models, _queryParams) {
    let targetRouteName = _targetRouteName || getActiveTargetName(this._routerMicrolib);
    assert(`The route ${targetRouteName} was not found`, targetRouteName && this._routerMicrolib.hasRoute(targetRouteName));

    let queryParams = {};

    this._processActiveTransitionQueryParams(targetRouteName, models, queryParams, _queryParams);

    assign(queryParams, _queryParams);
    this._prepareQueryParams(targetRouteName, models, queryParams);

    let transitionArgs = routeArgs(targetRouteName, models, queryParams);
    let transition = this._routerMicrolib.transitionTo(...transitionArgs);

    didBeginTransition(transition, this);

    return transition;
  },

  _processActiveTransitionQueryParams(targetRouteName, models, queryParams, _queryParams) {
    // merge in any queryParams from the active transition which could include
    // queryParams from the url on initial load.
    if (!this._routerMicrolib.activeTransition) { return; }

    var unchangedQPs = {};
    var qpUpdates = this._qpUpdates || {};
    for (var key in this._routerMicrolib.activeTransition.queryParams) {
      if (!qpUpdates[key]) {
        unchangedQPs[key] = this._routerMicrolib.activeTransition.queryParams[key];
      }
    }

    // We need to fully scope queryParams so that we can create one object
    // that represents both pased in queryParams and ones that aren't changed
    // from the active transition.
    this._fullyScopeQueryParams(targetRouteName, models, _queryParams);
    this._fullyScopeQueryParams(targetRouteName, models, unchangedQPs);
    assign(queryParams, unchangedQPs);
  },

  /**
    Prepares the query params for a URL or Transition. Restores any undefined QP
    keys/values, serializes all values, and then prunes any default values.

    @private
    @method _prepareQueryParams
    @param {String} targetRouteName
    @param {Array<Object>} models
    @param {Object} queryParams
    @return {Void}
  */
  _prepareQueryParams(targetRouteName, models, queryParams) {
    let state = calculatePostTransitionState(this, targetRouteName, models);
    this._hydrateUnsuppliedQueryParams(state, queryParams);
    this._serializeQueryParams(state.handlerInfos, queryParams);
    this._pruneDefaultQueryParamValues(state.handlerInfos, queryParams);
  },

  /**
    Returns the meta information for the query params of a given route. This
    will be overriden to allow support for lazy routes.

    @private
    @method _getQPMeta
    @param {HandlerInfo} handlerInfo
    @return {Object}
  */
  _getQPMeta(handlerInfo) {
    let route = handlerInfo.handler;
    return route && get(route, '_qp');
  },

  /**
    Returns a merged query params meta object for a given set of handlerInfos.
    Useful for knowing what query params are available for a given route hierarchy.

    @private
    @method _queryParamsFor
    @param {Array<HandlerInfo>} handlerInfos
    @return {Object}
   */
  _queryParamsFor(handlerInfos) {
    let leafRouteName = handlerInfos[handlerInfos.length - 1].name;
    if (this._qpCache[leafRouteName]) {
      return this._qpCache[leafRouteName];
    }

    let shouldCache = true;
    let qpsByUrlKey = {};
    let map = {};
    let qps = [];

    for (let i = 0; i < handlerInfos.length; ++i) {
      let qpMeta = this._getQPMeta(handlerInfos[i]);

      if (!qpMeta) {
        shouldCache = false;
        continue;
      }

      // Loop over each QP to make sure we don't have any collisions by urlKey
      for (let i = 0; i < qpMeta.qps.length; i++) {
        let qp = qpMeta.qps[i];
        let urlKey = qp.urlKey;
        let qpOther = qpsByUrlKey[urlKey];

        if (qpOther && qpOther.controllerName !== qp.controllerName) {
          let otherQP = qpsByUrlKey[urlKey];
          assert(`You're not allowed to have more than one controller property map to the same query param key, but both \`${otherQP.scopedPropertyName}\` and \`${qp.scopedPropertyName}\` map to \`${urlKey}\`. You can fix this by mapping one of the controller properties to a different query param key via the \`as\` config option, e.g. \`${otherQP.prop}: { as: \'other-${otherQP.prop}\' }\``, false);
        }

        qpsByUrlKey[urlKey] = qp;
        qps.push(qp);
      }

      assign(map, qpMeta.map);
    }

    let finalQPMeta = {
      qps: qps,
      map: map
    };

    if (shouldCache) {
      this._qpCache[leafRouteName] = finalQPMeta;
    }

    return finalQPMeta;
  },

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
    var state = calculatePostTransitionState(this, leafRouteName, contexts);
    var handlerInfos = state.handlerInfos;

    for (var i = 0, len = handlerInfos.length; i < len; ++i) {
      var qpMeta = this._getQPMeta(handlerInfos[i]);

      if (!qpMeta) { continue; }

      for (var j = 0, qpLen = qpMeta.qps.length; j < qpLen; ++j) {
        var qp = qpMeta.qps[j];

        var presentProp = qp.prop in queryParams  && qp.prop ||
                          qp.scopedPropertyName in queryParams && qp.scopedPropertyName ||
                          qp.urlKey in queryParams && qp.urlKey;

        if (presentProp) {
          if (presentProp !== qp.scopedPropertyName) {
            queryParams[qp.scopedPropertyName] = queryParams[presentProp];
            delete queryParams[presentProp];
          }
        }
      }
    }
  },

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
  _hydrateUnsuppliedQueryParams(state, queryParams) {
    let handlerInfos = state.handlerInfos;
    let appCache = this._bucketCache;

    for (let i = 0; i < handlerInfos.length; ++i) {
      let qpMeta = this._getQPMeta(handlerInfos[i]);

      if (!qpMeta) { continue; }

      for (let j = 0, qpLen = qpMeta.qps.length; j < qpLen; ++j) {
        let qp = qpMeta.qps[j];

        let presentProp = qp.prop in queryParams  && qp.prop ||
                          qp.scopedPropertyName in queryParams && qp.scopedPropertyName ||
                          qp.urlKey in queryParams && qp.urlKey;

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
  },

  _scheduleLoadingEvent(transition, originRoute) {
    this._cancelSlowTransitionTimer();
    this._slowTransitionTimer = run.scheduleOnce('routerTransitions', this, '_handleSlowTransition', transition, originRoute);
  },

  currentState: null,
  targetState: null,

  _handleSlowTransition(transition, originRoute) {
    if (!this._routerMicrolib.activeTransition) {
      // Don't fire an event if we've since moved on from
      // the transition that put us in a loading state.
      return;
    }

    this.set('targetState', RouterState.create({
      emberRouter: this,
      routerJs: this._routerMicrolib,
      routerJsState: this._routerMicrolib.activeTransition.state
    }));

    transition.trigger(true, 'loading', transition, originRoute);
  },

  _cancelSlowTransitionTimer() {
    if (this._slowTransitionTimer) {
      run.cancel(this._slowTransitionTimer);
    }
    this._slowTransitionTimer = null;
  },

  // These three helper functions are used to ensure errors aren't
  // re-raised if they're handled in a route's error action.
  _markErrorAsHandled(errorGuid) {
    this._handledErrors[errorGuid] = true;
  },

  _isErrorHandled(errorGuid) {
    return this._handledErrors[errorGuid];
  },

  _clearHandledError(errorGuid) {
    delete this._handledErrors[errorGuid];
  },

  _getEngineInstance({ name, instanceId, mountPoint }) {
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
        mountPoint
      });

      engineInstance.boot();

      engineInstances[name][instanceId] = engineInstance;
    }

    return engineInstance;
  }
});

/*
  Helper function for iterating over routes in a set of handlerInfos that are
  at or above the given origin route. Example: if `originRoute` === 'foo.bar'
  and the handlerInfos given were for 'foo.bar.baz', then the given callback
  will be invoked with the routes for 'foo.bar', 'foo', and 'application'
  individually.

  If the callback returns anything other than `true`, then iteration will stop.

  @private
  @param {Route} originRoute
  @param {Array<HandlerInfo>} handlerInfos
  @param {Function} callback
  @return {Void}
 */
function forEachRouteAbove(originRoute, handlerInfos, callback) {
  let originRouteFound = false;

  for (let i = handlerInfos.length - 1; i >= 0; --i) {
    let handlerInfo = handlerInfos[i];
    let route = handlerInfo.handler;

    if (originRoute === route) {
      originRouteFound = true;
    }

    if (!originRouteFound) {
      continue;
    }

    if (callback(route) !== true) {
      return;
    }
  }
}

// These get invoked when an action bubbles above ApplicationRoute
// and are not meant to be overridable.
let defaultActionHandlers = {

  willResolveModel(transition, originRoute) {
    originRoute.router._scheduleLoadingEvent(transition, originRoute);
  },

  // Attempt to find an appropriate error route or substate to enter.
  error(error, transition, originRoute) {
    let handlerInfos = transition.state.handlerInfos;
    let router = originRoute.router;

    forEachRouteAbove(originRoute, handlerInfos, route => {
      // Check for the existence of an 'error' route.
      // We don't check for an 'error' route on the originRoute, since that would
      // technically be below where we're at in the route hierarchy.
      if (originRoute !== route) {
        let errorRouteName = findRouteStateName(route, 'error');
        if (errorRouteName) {
          router.intermediateTransitionTo(errorRouteName, error);
          return false;
        }
      }

      // Check for an 'error' substate route
      let errorSubstateName = findRouteSubstateName(route, 'error');
      if (errorSubstateName) {
        router.intermediateTransitionTo(errorSubstateName, error);
        return false;
      }

      return true;
    });

    logError(error, `Error while processing route: ${transition.targetName}`);
  },

  // Attempt to find an appropriate loading route or substate to enter.
  loading(transition, originRoute) {
    let handlerInfos = transition.state.handlerInfos;
    let router = originRoute.router;

    forEachRouteAbove(originRoute, handlerInfos, route => {
      // Check for the existence of a 'loading' route.
      // We don't check for a 'loading' route on the originRoute, since that would
      // technically be below where we're at in the route hierarchy.
      if (originRoute !== route) {
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

  if (initialMessage) { errorArgs.push(initialMessage); }

  if (error) {
    if (error.message) { errorArgs.push(error.message); }
    if (error.stack) { errorArgs.push(error.stack); }

    if (typeof error === 'string') { errorArgs.push(error); }
  }

  Logger.error.apply(this, errorArgs);
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
  let router = route.router;
  let owner = getOwner(route);

  let routeName = route.routeName;
  let substateName = `${routeName}_${state}`;

  let routeNameFull = route.fullRouteName;
  let substateNameFull = `${routeNameFull}_${state}`;

  return routeHasBeenDefined(owner, router, substateName, substateNameFull) ?
    substateNameFull :
    '';
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
  let router = route.router;
  let owner = getOwner(route);

  let routeName = route.routeName;
  let stateName = routeName === 'application' ? state : `${routeName}.${state}`;

  let routeNameFull = route.fullRouteName;
  let stateNameFull = routeNameFull === 'application' ? state : `${routeNameFull}.${state}`;

  return routeHasBeenDefined(owner, router, stateName, stateNameFull) ?
    stateNameFull :
    '';
}

/**
  Determines whether or not a route has been defined by checking that the route
  is in the Router's map and the owner has a registration for that route.

  @private
  @param {Owner} owner
  @param {Ember.Router} router
  @param {String} localName
  @param {String} fullName
  @return {Boolean}
*/
function routeHasBeenDefined(owner, router, localName, fullName) {
  let routerHasRoute = router.hasRoute(fullName);
  let ownerHasRoute = owner.hasRegistration(`template:${localName}`) || owner.hasRegistration(`route:${localName}`);
  return routerHasRoute && ownerHasRoute;
}

export function triggerEvent(handlerInfos, ignoreFailure, args) {
  let name = args.shift();

  if (!handlerInfos) {
    if (ignoreFailure) { return; }
    throw new EmberError(`Can't trigger action '${name}' because your app hasn't finished transitioning into its first route. To trigger an action on destination routes during a transition, you can call \`.send()\` on the \`Transition\` object passed to the \`model/beforeModel/afterModel\` hooks.`);
  }

  let eventWasHandled = false;
  let handlerInfo, handler;

  for (let i = handlerInfos.length - 1; i >= 0; i--) {
    handlerInfo = handlerInfos[i];
    handler = handlerInfo.handler;

    if (handler && handler.actions && handler.actions[name]) {
      if (handler.actions[name].apply(handler, args) === true) {
        eventWasHandled = true;
      } else {
        // Should only hit here if a non-bubbling error action is triggered on a route.
        if (name === 'error') {
          let errorId = guidFor(args[0]);
          handler.router._markErrorAsHandled(errorId);
        }
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
  let routerMicrolib = emberRouter._routerMicrolib;
  let state = routerMicrolib.applyIntent(leafRouteName, contexts);
  let handlerInfos = state.handlerInfos;
  let params = state.params;

  for (let i = 0; i < handlerInfos.length; ++i) {
    let handlerInfo = handlerInfos[i];

    // If the handlerInfo is not resolved, we serialize the context into params
    if (!handlerInfo.isResolved) {
      params[handlerInfo.name] = handlerInfo.serialize(handlerInfo.context);
    } else {
      params[handlerInfo.name] = handlerInfo.params;
    }
  }
  return state;
}

function updatePaths(router) {
  let infos = router._routerMicrolib.currentHandlerInfos;
  if (infos.length === 0) { return; }

  let path = EmberRouter._routePath(infos);
  let currentRouteName = infos[infos.length - 1].name;
  let currentURL = router.get('location').getURL();

  set(router, 'currentPath', path);
  set(router, 'currentRouteName', currentRouteName);
  set(router, 'currentURL', currentURL);

  let appController = getOwner(router).lookup('controller:application');

  if (!appController) {
    // appController might not exist when top-level loading/error
    // substates have been entered since ApplicationRoute hasn't
    // actually been entered at that point.
    return;
  }

  if (!('currentPath' in appController)) {
    defineProperty(appController, 'currentPath');
  }

  set(appController, 'currentPath', path);

  if (!('currentRouteName' in appController)) {
    defineProperty(appController, 'currentRouteName');
  }

  set(appController, 'currentRouteName', currentRouteName);
}

EmberRouter.reopenClass({
  router: null,

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

    ```javascript
    App.Router.map(function(){
      this.route('post', { path: '/post/:post_id' }, function() {
        this.route('edit');
        this.route('comments', { resetNamespace: true }, function() {
          this.route('new');
        });
      });
    });
    ```

    For more detailed documentation and examples please see
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
    for (let i = 1; i < handlerInfos.length; i++) {
      name = handlerInfos[i].name;
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
});

function didBeginTransition(transition, router) {
  let routerState = RouterState.create({
    emberRouter: router,
    routerJs: router._routerMicrolib,
    routerJsState: transition.state
  });

  if (!router.currentState) {
    router.set('currentState', routerState);
  }
  router.set('targetState', routerState);

  transition.promise = transition.catch(error => {
    let errorId = guidFor(error);

    if (router._isErrorHandled(errorId)) {
      router._clearHandledError(errorId);
    } else {
      throw error;
    }
  });
}

function resemblesURL(str) {
  return typeof str === 'string' && (str === '' || str[0] === '/');
}

function forEachQueryParam(router, handlerInfos, queryParams, callback) {
  let qpCache = router._queryParamsFor(handlerInfos);

  for (let key in queryParams) {
    if (!queryParams.hasOwnProperty(key)) { continue; }
    let value = queryParams[key];
    let qp = qpCache.map[key];

    callback(key, value, qp);
  }
}

function findLiveRoute(liveRoutes, name) {
  if (!liveRoutes) { return; }
  let stack = [liveRoutes];
  while (stack.length > 0) {
    let test = stack.shift();
    if (test.render.name === name) {
      return test;
    }
    let outlets = test.outlets;
    for (let outletName in outlets) {
      stack.push(outlets[outletName]);
    }
  }
}

function appendLiveRoute(liveRoutes, defaultParentState, renderOptions) {
  let target;
  let myState = {
    render: renderOptions,
    outlets: Object.create(null),
    wasUsed: false
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
      deprecate(
        `Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated.`,
        false,
        {
          id: 'ember-routing.top-level-render-helper',
          until: '3.0.0',
          url: 'http://emberjs.com/deprecations/v2.x/#toc_rendering-into-a-render-helper-that-resolves-to-an-outlet'
        }
      );

      // Megahax time. Post-3.0-breaking-changes, we will just assert
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
    liveRoutes,
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
  run.schedule('afterRender', () => {
    // `wasUsed` gets set by the render helper.
    assert(`You attempted to render into '${into}' but it was not found`,
                 liveRoutes.outlets.__ember_orphans__.outlets[into].wasUsed);
  });
}

function representEmptyRoute(liveRoutes, defaultParentState, route) {
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
        outlet: 'main'
      },
      outlets: {}
    };
    return defaultParentState;
  }
}

deprecateProperty(EmberRouter.prototype, 'router', '_routerMicrolib', {
  id: 'ember-router.router',
  until: '2.16',
  url: 'http://emberjs.com/deprecations/v2.x/#toc_ember-router-router-renamed-to-ember-router-_routerMicrolib'
});

export default EmberRouter;
