/**
@module ember
@submodule ember-routing
*/

var Router = requireModule("router")['default'];
var get = Ember.get, set = Ember.set;
var defineProperty = Ember.defineProperty;

var DefaultView = Ember._MetamorphView;

require("ember-routing/system/dsl");

/**
  The `Ember.Router` class manages the application state and URLs. Refer to
  the [routing guide](http://emberjs.com/guides/routing/) for documentation.

  @class Router
  @namespace Ember
  @extends Ember.Object
*/
Ember.Router = Ember.Object.extend(Ember.Evented, {
  location: 'hash',

  init: function() {
    this.router = this.constructor.router || this.constructor.map(Ember.K);
    this._activeViews = {};
    this._setupLocation();

    // Activate observers on `title`
    if (Ember.FEATURES.isEnabled("ember-document-title")) {
      this.get('title');
    }
  },

  /**
    @private

    Trigger the `titleTokens` property to change to cause
    a cascade of changes down to the `title`.
   */
  titleTokensDidChange: function() {
    this.notifyPropertyChange('titleTokens');
  },

  /**
    The series of `title`s that comprise the active routes.

    @property titleTokens
    @type String[]
    @default []
   */
  titleTokens: Ember.computed(function() {
    var currentHandlerInfos = get(this, 'router.currentHandlerInfos'),
        tokens = [],
        token;

    if (currentHandlerInfos) {
      for (var i = 0, len = currentHandlerInfos.length; i < len; i++) {
        token = get(currentHandlerInfos[i], 'handler.title');
        if (token) {
          tokens.push(token);
        }
      }
    }

    return tokens;
  }),

  /**
    The title divider to use between each route `title`.

    @property titleDivider
    @type String
    @default ' - '
   */
  titleDivider: ' - ',

  /**
    A flag to indicate whether the document title should
    sort the route `title`s from most general to most
    specific:

    ```
    Ember.js - About
    ```

    or most specific to most general:

    ```
    About - Ember.js
    ```

    @property titleSpecificityIncreases
    @type Boolean
    @default false
   */
  titleSpecificityIncreases: false,

  /**
    The title to be used to control the `document.title`.

    Override this property to fully customize how the
    `document.title` is computed. When overriding this
    property, use the `titleTokens` property to get all
    of the tokens that are active in order of most general
    to most specific.

    @property type
    @type String
    @default ''
   */
  title: Ember.computed('titleTokens', 'titleDivider', 'titleSpecificityIncreases', function() {
    var tokens  = get(this, 'titleTokens'),
        divider = get(this, 'titleDivider');

    if (!get(this, 'titleSpecificityIncreases')) {
      tokens = Ember.copy(tokens).reverse();
    }

    return tokens.join(divider);
  }),

  titleDidChange: Ember.observer(function() {
    var title = get(this, 'title');
    if (title) {
      document.title = title;
    }
  }, 'title'),

  url: Ember.computed(function() {
    return get(this, 'location').getURL();
  }),

  startRouting: function() {
    this.router = this.router || this.constructor.map(Ember.K);

    var router = this.router,
        location = get(this, 'location'),
        container = this.container,
        self = this;

    this._setupRouter(router, location);

    container.register('view:default', DefaultView);
    container.register('view:toplevel', Ember.View.extend());

    location.onUpdateURL(function(url) {
      self.handleURL(url);
    });

    this.handleURL(location.getURL());
  },

  willTransition: function(infos) {
    var activeHandlers = get(this, 'router.currentHandlerInfos');

    if (Ember.FEATURES.isEnabled("ember-document-title")) {
      if (activeHandlers) {
        for (var i = 0, len = activeHandlers.length; i < len; i++) {
          Ember.removeObserver(activeHandlers[i].handler, 'title', this, this.titleTokensDidChange);
        }
      }
    }
  },

  didTransition: function(infos) {
    updatePaths(this);

    if (Ember.FEATURES.isEnabled("ember-routing-loading-error-substates")) {
      this._cancelLoadingEvent();
    } else {
      exitLegacyLoadingRoute(this);
    }

    if (Ember.FEATURES.isEnabled("ember-document-title")) {
      for (var i = 0, len = infos.length; i < len; i++) {
        Ember.addObserver(infos[i].handler, 'title', this, this.titleTokensDidChange);
      }

      this.notifyPropertyChange('titleTokens');
    }

    this.notifyPropertyChange('url');

    if (Ember.FEATURES.isEnabled("ember-routing-didTransition-hook")) {
      // Put this in the runloop so url will be accurate. Seems
      // less surprising than didTransition being out of sync.
      Ember.run.once(this, this.trigger, 'didTransition');
    }

    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log("Transitioned into '" + Ember.Router._routePath(infos) + "'");
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
      Ember.Logger.log("Intermediate-transitioned into '" + Ember.Router._routePath(infos) + "'");
    }
  },

  replaceWith: function() {
    return this._doTransition('replaceWith', arguments);
  },

  generate: function() {
    var url = this.router.generate.apply(this.router, arguments);
    return this.location.formatURL(url);
  },

  isActive: function(routeName) {
    var router = this.router;
    return router.isActive.apply(router, arguments);
  },

  send: function(name, context) {
    this.router.trigger.apply(this.router, arguments);
  },

  hasRoute: function(route) {
    return this.router.hasRoute(route);
  },

  /**
    @private

    Resets the state of the router by clearing the current route
    handlers and deactivating them.

    @method reset
   */
  reset: function() {
    this.router.reset();
  },

  willDestroy: function(){
    var location = get(this, 'location');
    location.destroy();

    this._super.apply(this, arguments);
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
        rootURL = get(this, 'rootURL'),
        options = {};

    if (typeof rootURL === 'string') {
      options.rootURL = rootURL;
    }

    if ('string' === typeof location) {
      options.implementation = location;
      location = set(this, 'location', Ember.Location.create(options));
    }
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
        if (Ember.FEATURES.isEnabled("ember-routing-loading-error-substates")) {
        } else {
          if (name === 'loading') { return {}; }
        }

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
      Ember.run.once(doUpdateURL);
    };

    if (location.replaceURL) {
      var doReplaceURL = function() {
        location.replaceURL(lastURL);
      };

      router.replaceURL = function(path) {
        lastURL = path;
        Ember.run.once(doReplaceURL);
      };
    }

    router.didTransition = function(infos) {
      emberRouter.didTransition(infos);
    };

    router.willTransition = function(infos) {
      emberRouter.willTransition(infos);
    };
  },

  _doTransition: function(method, args) {
    // Normalize blank route to root URL.
    args = [].slice.call(args);
    args[0] = args[0] || '/';

    var passedName = args[0], name, self = this,
      isQueryParamsOnly = false;

    if (Ember.FEATURES.isEnabled("query-params")) {
      isQueryParamsOnly = (args.length === 1 && args[0].hasOwnProperty('queryParams'));
    }

    if (!isQueryParamsOnly && passedName.charAt(0) === '/') {
      name = passedName;
    } else if (!isQueryParamsOnly) {
      if (!this.router.hasRoute(passedName)) {
        name = args[0] = passedName + '.index';
      } else {
        name = passedName;
      }

      Ember.assert("The route " + passedName + " was not found", this.router.hasRoute(name));
    }

    var transitionPromise = this.router[method].apply(this.router, args);

    // Don't schedule loading state entry if user has already aborted the transition.
    if (Ember.FEATURES.isEnabled("ember-routing-loading-error-substates")) {
    } else {
      scheduleLegacyLoadingRouteEntry(this);
    }

    transitionPromise.then(null, function(error) {
      if (error.name === "UnrecognizedURLError") {
        Ember.assert("The URL '" + error.message + "' did not match any routes in your application");
      }
    });

    // We want to return the configurable promise object
    // so that callers of this function can use `.method()` on it,
    // which obviously doesn't exist for normal RSVP promises.
    return transitionPromise;
  },

  _scheduleLoadingEvent: function(transition, originRoute) {
    this._cancelLoadingEvent();
    if (Ember.FEATURES.isEnabled("ember-routing-loading-error-substates")) {
      this._loadingStateTimer = Ember.run.scheduleOnce('routerTransitions', this, '_fireLoadingEvent', transition, originRoute);
    }
  },

  _fireLoadingEvent: function(transition, originRoute) {
    if (Ember.FEATURES.isEnabled("ember-routing-loading-error-substates")) {
      if (!this.router.activeTransition) {
        // Don't fire an event if we've since moved on from
        // the transition that put us in a loading state.
        return;
      }

      transition.trigger(true, 'loading', transition, originRoute);
    } else {
      enterLegacyLoadingRoute(this);
    }
  },

  _cancelLoadingEvent: function () {
    if (this._loadingStateTimer) {
      Ember.run.cancel(this._loadingStateTimer);
    }
    this._loadingStateTimer = null;
  }
});

/**
  @private

  Helper function for iterating root-ward, starting
  from (but not including) the provided `originRoute`.

  Returns true if the last callback fired requested
  to bubble upward.
 */
function forEachRouteAbove(originRoute, transition, callback) {
  var handlerInfos = transition.handlerInfos,
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
    if (Ember.FEATURES.isEnabled("ember-routing-loading-error-substates")) {

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
    }

    Ember.Logger.assert(false, 'Error while loading route: ' + Ember.inspect(error));
  },

  loading: function(transition, originRoute) {
    if (Ember.FEATURES.isEnabled("ember-routing-loading-error-substates")) {

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
    throw new Ember.Error("Can't trigger action '" + name + "' because your app hasn't finished transitioning into its first route. To trigger an action on destination routes during a transition, you can call `.send()` on the `Transition` object passed to the `model/beforeModel/afterModel` hooks.");
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
    throw new Ember.Error("Nothing handled the action '" + name + "'.");
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
      path = Ember.Router._routePath(infos);

  if (!('currentPath' in appController)) {
    defineProperty(appController, 'currentPath');
  }

  set(appController, 'currentPath', path);

  if (!('currentRouteName' in appController)) {
    defineProperty(appController, 'currentRouteName');
  }

  set(appController, 'currentRouteName', infos[infos.length - 1].name);
}

function scheduleLegacyLoadingRouteEntry(router) {
  cancelLegacyLoadingRouteEntry(router);
  if (router.router.activeTransition) {
    router._legacyLoadingStateTimer = Ember.run.scheduleOnce('routerTransitions', null, enterLegacyLoadingRoute, router);
  }
}

function enterLegacyLoadingRoute(router) {
  var loadingRoute = router.router.getHandler('loading');
  if (loadingRoute && !loadingRoute._loadingStateActive) {
    if (loadingRoute.enter) { loadingRoute.enter(); }
    if (loadingRoute.setup) { loadingRoute.setup(); }
    loadingRoute._loadingStateActive = true;
  }
}

function cancelLegacyLoadingRouteEntry(router) {
  if (router._legacyLoadingStateTimer) {
    Ember.run.cancel(router._legacyLoadingStateTimer);
  }
  router._legacyLoadingStateTimer = null;
}

function exitLegacyLoadingRoute(router) {

  cancelLegacyLoadingRouteEntry(router);

  var loadingRoute = router.router.getHandler('loading');

  if (loadingRoute && loadingRoute._loadingStateActive) {
    if (loadingRoute.exit) { loadingRoute.exit(); }
    loadingRoute._loadingStateActive = false;
  }
}

Ember.Router.reopenClass({
  router: null,
  map: function(callback) {
    var router = this.router;
    if (!router) {
      router = new Router();
      router.callbacks = [];
      router.triggerEvent = triggerEvent;
      this.reopenClass({ router: router });
    }

    if (get(this, 'namespace.LOG_TRANSITIONS_INTERNAL')) {
      router.log = Ember.Logger.debug;
    }

    var dsl = Ember.RouterDSL.map(function() {
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

    for (var i=1, l=handlerInfos.length; i<l; i++) {
      var name = handlerInfos[i].name,
          nameParts = name.split(".");

      path.push(nameParts[nameParts.length - 1]);
    }

    return path.join(".");
  }
});

Router.Transition.prototype.send = Router.Transition.prototype.trigger;


