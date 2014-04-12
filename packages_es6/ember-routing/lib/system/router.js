import Ember from "ember-metal/core"; // FEATURES, Logger, K, assert
import EmberError from "ember-metal/error";
import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import {forEach} from "ember-metal/array";
import {defineProperty} from "ember-metal/properties";
import {computed} from "ember-metal/computed";
import merge from "ember-metal/merge";
import run from "ember-metal/run_loop";
import EnumerableUtils from "ember-metal/enumerable_utils";

import {fmt} from "ember-runtime/system/string";
import EmberObject from "ember-runtime/system/object";
import Evented from "ember-runtime/mixins/evented";
import EmberRouterDSL from "ember-routing/system/dsl";
import {View as EmberView} from "ember-views/views/view";
import EmberLocation from "ember-routing/location/api";
import {_MetamorphView} from "ember-handlebars/views/metamorph_view";

// requireModule("ember-handlebars");
// requireModule("ember-runtime");
// requireModule("ember-views");

/**
@module ember
@submodule ember-routing
*/

// // side effect of loading some Ember globals, for now
// requireModule("ember-handlebars");
// requireModule("ember-runtime");
// requireModule("ember-views");

var Router = requireModule("router")['default'];
var Transition = requireModule("router/transition").Transition;

var slice = [].slice;
var forEach = EnumerableUtils.forEach;

var DefaultView = _MetamorphView;

/**
  The `Ember.Router` class manages the application state and URLs. Refer to
  the [routing guide](http://emberjs.com/guides/routing/) for documentation.

  @class Router
  @namespace Ember
  @extends Ember.Object
*/
var EmberRouter = EmberObject.extend(Evented, {
  /**
    The `location` property determines the type of URL's that your
    application will use.

    The following location types are currently available:

    * `hash`
    * `history`
    * `none`

    @property location
    @default 'hash'
    @see {Ember.Location}
  */
  location: 'hash',

  init: function() {
    this.router = this.constructor.router || this.constructor.map(Ember.K);
    this._activeViews = {};
    this._setupLocation();
    this._qpCache = {};
    this._queuedQPChanges = {};

    if (get(this, 'namespace.LOG_TRANSITIONS_INTERNAL')) {
      this.router.log = Ember.Logger.debug;
    }
  },

  /**
    Represents the current URL.

    @method url
    @return {String} The current URL.
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
  startRouting: function() {
    this.router = this.router || this.constructor.map(Ember.K);

    var router = this.router,
        location = get(this, 'location'),
        container = this.container,
        self = this,
        initialURL = get(this, 'initialURL');

    // Allow the Location class to cancel the router setup while it refreshes
    // the page
    if (get(location, 'cancelRouterSetup')) {
      return;
    }

    this._setupRouter(router, location);

    container.register('view:default', DefaultView);
    container.register('view:toplevel', EmberView.extend());

    location.onUpdateURL(function(url) {
      self.handleURL(url);
    });

    if (typeof initialURL === "undefined") {
      initialURL = location.getURL();
    }

    this.handleURL(initialURL);
  },

  /**
    Handles updating the paths and notifying any listeners of the URL
    change.

    Triggers the router level `didTransition` hook.

    @method didTransition
    @private
    @since 1.2.0
  */
  didTransition: function(infos) {
    updatePaths(this);

    this._cancelLoadingEvent();

    this.notifyPropertyChange('url');

    // Put this in the runloop so url will be accurate. Seems
    // less surprising than didTransition being out of sync.
    run.once(this, this.trigger, 'didTransition');

    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log("Transitioned into '" + EmberRouter._routePath(infos) + "'");
    }
  },

  handleURL: function(url) {
    return this._doTransition('handleURL', [url]);
  },

  transitionTo: function() {
    return this._doTransition('transitionTo', arguments);
  },

  intermediateTransitionTo: function() {
    this.router.intermediateTransitionTo.apply(this.router, arguments);

    updatePaths(this);

    var infos = this.router.currentHandlerInfos;
    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log("Intermediate-transitioned into '" + EmberRouter._routePath(infos) + "'");
    }
  },

  replaceWith: function() {
    return this._doTransition('replaceWith', arguments);
  },

  generate: function() {
    var url = this.router.generate.apply(this.router, arguments);
    return this.location.formatURL(url);
  },

  /**
    Determines if the supplied route is currently active.

    @method isActive
    @param routeName
    @return {Boolean}
    @private
  */
  isActive: function(routeName) {
    var router = this.router;
    return router.isActive.apply(router, arguments);
  },

  send: function(name, context) {
    this.router.trigger.apply(this.router, arguments);
  },

  /**
    Does this router instance have the given route.

    @method hasRoute
    @return {Boolean}
    @private
  */
  hasRoute: function(route) {
    return this.router.hasRoute(route);
  },

  /**
    Resets the state of the router by clearing the current route
    handlers and deactivating them.

    @private
    @method reset
   */
  reset: function() {
    this.router.reset();
  },

  _lookupActiveView: function(templateName) {
    var active = this._activeViews[templateName];
    return active && active[0];
  },

  _connectActiveView: function(templateName, view) {
    var existing = this._activeViews[templateName];

    if (existing) {
      existing[0].off('willDestroyElement', this, existing[1]);
    }

    var disconnect = function() {
      delete this._activeViews[templateName];
    };

    this._activeViews[templateName] = [view, disconnect];
    view.one('willDestroyElement', this, disconnect);
  },

  _setupLocation: function() {
    var location = get(this, 'location'),
        rootURL = get(this, 'rootURL');

    if ('string' === typeof location && this.container) {
      var resolvedLocation = this.container.lookup('location:' + location);

      if ('undefined' !== typeof resolvedLocation) {
        location = set(this, 'location', resolvedLocation);
      } else {
        // Allow for deprecated registration of custom location API's
        var options = {implementation: location};

        location = set(this, 'location', EmberLocation.create(options));
      }
    }

    if (typeof rootURL === 'string') {
      location.rootURL = rootURL;
    }

    // ensure that initState is called AFTER the rootURL is set on
    // the location instance
    if (typeof location.initState === 'function') { location.initState(); }
  },

  _getHandlerFunction: function() {
    var seen = {}, container = this.container,
        DefaultRoute = container.lookupFactory('route:basic'),
        self = this;

    return function(name) {
      var routeName = 'route:' + name,
          handler = container.lookup(routeName);

      if (seen[name]) { return handler; }

      seen[name] = true;

      if (!handler) {
        container.register(routeName, DefaultRoute.extend());
        handler = container.lookup(routeName);

        if (get(self, 'namespace.LOG_ACTIVE_GENERATION')) {
          Ember.Logger.info("generated -> " + routeName, { fullName: routeName });
        }
      }

      handler.routeName = name;
      return handler;
    };
  },

  _setupRouter: function(router, location) {
    var lastURL, emberRouter = this;

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
  },

  _doTransition: function(method, args) {
    // Normalize blank route to root URL.
    args = slice.call(args);
    args[0] = args[0] || '/';

    var name = args[0], self = this,
      isQueryParamsOnly = false, queryParams;

    if (Ember.FEATURES.isEnabled("query-params-new")) {

      var possibleQueryParamArg = args[args.length - 1];
      if (possibleQueryParamArg && possibleQueryParamArg.hasOwnProperty('queryParams')) {
        if (args.length === 1) {
          isQueryParamsOnly = true;
          name = null;
        }
        queryParams = args[args.length - 1].queryParams;
      }
    }

    if (!isQueryParamsOnly && name.charAt(0) !== '/') {
      Ember.assert("The route " + name + " was not found", this.router.hasRoute(name));
    }

    if (queryParams) {
      // router.js expects queryParams to be passed in in
      // their final serialized form, so we need to translate.

      if (!name) {
        // Need to determine destination route name.
        var handlerInfos = this.router.activeTransition ?
                           this.router.activeTransition.state.handlerInfos :
                           this.router.state.handlerInfos;
        name = handlerInfos[handlerInfos.length - 1].name;
        args.unshift(name);
      }

      var qpCache = this._queryParamsFor(name), qps = qpCache.qps;

      var finalParams = {};
      for (var key in queryParams) {
        if (!queryParams.hasOwnProperty(key)) { continue; }
        var inputValue = queryParams[key],
            qp = qpCache.map[key];

        if (!qp) {
          throw new EmberError("Unrecognized query param " + key + " provided as transition argument");
        }
        finalParams[qp.urlKey] = qp.route.serializeQueryParam(inputValue, qp.urlKey, qp.type);
      }

      // Perform any necessary serialization.
      args[args.length-1].queryParams = finalParams;
    }

    var transitionPromise = this.router[method].apply(this.router, args);

    transitionPromise.then(null, function(error) {
      if (error && error.name === "UnrecognizedURLError") {
        Ember.assert("The URL '" + error.message + "' did not match any routes in your application");
      }
    }, 'Ember: Check for Router unrecognized URL error');

    // We want to return the configurable promise object
    // so that callers of this function can use `.method()` on it,
    // which obviously doesn't exist for normal RSVP promises.
    return transitionPromise;
  },

  _queryParamsFor: function(leafRouteName) {
    if (this._qpCache[leafRouteName]) {
      return this._qpCache[leafRouteName];
    }

    var map = {}, qps = [], qpCache = this._qpCache[leafRouteName] = {
      map: map,
      qps: qps
    };

    var routerjs = this.router,
        recogHandlerInfos = routerjs.recognizer.handlersFor(leafRouteName);

    for (var i = 0, len = recogHandlerInfos.length; i < len; ++i) {
      var recogHandler = recogHandlerInfos[i],
          route = routerjs.getHandler(recogHandler.handler),
          qpMeta = get(route, '_qp');

      if (!qpMeta) { continue; }

      merge(map, qpMeta.map);
      qps.push.apply(qps, qpMeta.qps);
    }

    return {
      qps: qps,
      map: map
    };
  },

  _scheduleLoadingEvent: function(transition, originRoute) {
    this._cancelLoadingEvent();
    this._loadingStateTimer = run.scheduleOnce('routerTransitions', this, '_fireLoadingEvent', transition, originRoute);
  },

  _fireLoadingEvent: function(transition, originRoute) {
    if (!this.router.activeTransition) {
      // Don't fire an event if we've since moved on from
      // the transition that put us in a loading state.
      return;
    }

    transition.trigger(true, 'loading', transition, originRoute);
  },

  _cancelLoadingEvent: function () {
    if (this._loadingStateTimer) {
      run.cancel(this._loadingStateTimer);
    }
    this._loadingStateTimer = null;
  }
});

function controllerOrProtoFor(controllerName, container, getProto) {
  var fullName = container.normalize('controller:' + controllerName);
  if (!getProto && container.cache.has(fullName)) {
    return container.lookup(fullName);
  } else {
    // Controller hasn't been instantiated yet; just return its proto.
    var controllerClass = container.lookupFactory(fullName);
    if (controllerClass && typeof controllerClass.proto === 'function') {
      return controllerClass.proto();
    } else {
      return {};
    }
  }
}

/*
  Helper function for iterating root-ward, starting
  from (but not including) the provided `originRoute`.

  Returns true if the last callback fired requested
  to bubble upward.

  @private
 */
function forEachRouteAbove(originRoute, transition, callback) {
  var handlerInfos = transition.state.handlerInfos,
      originRouteFound = false;

  for (var i = handlerInfos.length - 1; i >= 0; --i) {
    var handlerInfo = handlerInfos[i],
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

  willResolveModel: function(transition, originRoute) {
    originRoute.router._scheduleLoadingEvent(transition, originRoute);
  },

  error: function(error, transition, originRoute) {
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
    } else {
      // Don't fire an assertion if we found an error substate.
      return;
    }

    var errorArgs = ['Error while loading route: ' + transition.targetName];

    if (error) {
      if (error.message) { errorArgs.push(error.message); }
      if (error.stack)   { errorArgs.push(error.stack); }

      if (typeof error === "string") { errorArgs.push(error); }
    }

    Ember.Logger.error.apply(this, errorArgs);
  },

  loading: function(transition, originRoute) {
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

function findChildRouteName(parentRoute, originatingChildRoute, name) {
  var router = parentRoute.router,
      childName,
      targetChildRouteName = originatingChildRoute.routeName.split('.').pop(),
      namespace = parentRoute.routeName === 'application' ? '' : parentRoute.routeName + '.';

  if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {
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
         (container.has('template:' + name) || container.has('route:' + name));
}

function triggerEvent(handlerInfos, ignoreFailure, args) {
  var name = args.shift();

  if (!handlerInfos) {
    if (ignoreFailure) { return; }
    throw new EmberError("Can't trigger action '" + name + "' because your app hasn't finished transitioning into its first route. To trigger an action on destination routes during a transition, you can call `.send()` on the `Transition` object passed to the `model/beforeModel/afterModel` hooks.");
  }

  var eventWasHandled = false;

  for (var i = handlerInfos.length - 1; i >= 0; i--) {
    var handlerInfo = handlerInfos[i],
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
    throw new EmberError("Nothing handled the action '" + name + "'. If you did handle the action, this error can be caused by returning true from an action handler in a controller, causing the action to bubble.");
  }
}

function updatePaths(router) {
  var appController = router.container.lookup('controller:application');

  if (!appController) {
    // appController might not exist when top-level loading/error
    // substates have been entered since ApplicationRoute hasn't
    // actually been entered at that point.
    return;
  }

  var infos = router.router.currentHandlerInfos,
      path = EmberRouter._routePath(infos);

  if (!('currentPath' in appController)) {
    defineProperty(appController, 'currentPath');
  }

  set(appController, 'currentPath', path);

  if (!('currentRouteName' in appController)) {
    defineProperty(appController, 'currentRouteName');
  }

  set(appController, 'currentRouteName', infos[infos.length - 1].name);
}

EmberRouter.reopenClass({
  router: null,
  map: function(callback) {
    var router = this.router;
    if (!router) {
      router = new Router();
      router.callbacks = [];
      router.triggerEvent = triggerEvent;
      this.reopenClass({ router: router });
    }

    var dsl = EmberRouterDSL.map(function() {
      this.resource('application', { path: "/" }, function() {
        for (var i=0; i < router.callbacks.length; i++) {
          router.callbacks[i].call(this);
        }
        callback.call(this);
      });
    });

    router.callbacks.push(callback);
    router.map(dsl.generate());
    return router;
  },

  _routePath: function(handlerInfos) {
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

    for (var i=1, l=handlerInfos.length; i<l; i++) {
      var name = handlerInfos[i].name,
          nameParts = name.split("."),
          oldNameParts = slice.call(path);

      while (oldNameParts.length) {
        if (intersectionMatches(oldNameParts, nameParts)) {
          break;
        }
        oldNameParts.shift();
      }

      path.push.apply(path, nameParts.slice(oldNameParts.length));
    }

    return path.join(".");
  }
});

export default EmberRouter;
