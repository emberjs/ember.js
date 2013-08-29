/**
@module ember
@submodule ember-routing
*/

var Router = requireModule("router");
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
Ember.Router = Ember.Object.extend({
  location: 'hash',

  init: function() {
    this.router = this.constructor.router || this.constructor.map(Ember.K);
    this._activeViews = {};
    this._setupLocation();
  },

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

  didTransition: function(infos) {
    var appController = this.container.lookup('controller:application'),
        path = Ember.Router._routePath(infos);

    if (!('currentPath' in appController)) { defineProperty(appController, 'currentPath'); }
    set(appController, 'currentPath', path);

    if (!('currentRouteName' in appController)) { defineProperty(appController, 'currentRouteName'); }
    set(appController, 'currentRouteName', infos[infos.length - 1].name);

    this.notifyPropertyChange('url');

    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log("Transitioned into '" + path + "'");
    }
  },

  handleURL: function(url) {
    return this._doTransition('handleURL', [url]);
  },

  transitionTo: function() {
    return this._doTransition('transitionTo', arguments);
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
        if (name === 'loading') { return {}; }

        container.register(routeName, DefaultRoute.extend());
        handler = container.lookup(routeName);

        if (get(self, 'namespace.LOG_ACTIVE_GENERATION')) {
          Ember.Logger.info("generated -> " + routeName, { fullName: routeName });
        }
      }

      if (name === 'application') {
        // Inject default `error` handler.
        handler.events = handler.events || {};
        handler.events.error = handler.events.error || Ember.Router._defaultErrorHandler;
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
  },

  _doTransition: function(method, args) {
    // Normalize blank route to root URL.
    args = [].slice.call(args);
    args[0] = args[0] || '/';

    var passedName = args[0], name, self = this;

    if (passedName.charAt(0) === '/') {
      name = passedName;
    } else {
      if (!this.router.hasRoute(passedName)) {
        name = args[0] = passedName + '.index';
      } else {
        name = passedName;
      }

      Ember.assert("The route " + passedName + " was not found", this.router.hasRoute(name));
    }

    var transitionPromise = this.router[method].apply(this.router, args);

    // Don't schedule loading state entry if user has already aborted the transition.
    if (this.router.activeTransition) {
      this._scheduleLoadingStateEntry();
    }

    transitionPromise.then(function(route) {
      self._transitionCompleted(route);
    });

    // We want to return the configurable promise object
    // so that callers of this function can use `.method()` on it,
    // which obviously doesn't exist for normal RSVP promises.
    return transitionPromise;
  },

  _scheduleLoadingStateEntry: function() {
    if (this._loadingStateActive) { return; }
    this._shouldEnterLoadingState = true;
    Ember.run.scheduleOnce('routerTransitions', this, this._enterLoadingState);
  },

  _enterLoadingState: function() {
    if (this._loadingStateActive || !this._shouldEnterLoadingState) { return; }

    var loadingRoute = this.router.getHandler('loading');
    if (loadingRoute) {
      if (loadingRoute.enter) { loadingRoute.enter(); }
      if (loadingRoute.setup) { loadingRoute.setup(); }
      this._loadingStateActive = true;
    }
  },

  _exitLoadingState: function () {
    this._shouldEnterLoadingState = false;
    if (!this._loadingStateActive) { return; }

    var loadingRoute = this.router.getHandler('loading');
    if (loadingRoute && loadingRoute.exit) { loadingRoute.exit(); }
    this._loadingStateActive = false;
  },

  _transitionCompleted: function(route) {
    this.notifyPropertyChange('url');
    this._exitLoadingState();
  }
});

function triggerEvent(handlerInfos, ignoreFailure, args) {
  var name = args.shift();

  if (!handlerInfos) {
    if (ignoreFailure) { return; }
    throw new Error("Could not trigger event '" + name + "'. There are no active handlers");
  }

  var eventWasHandled = false;

  for (var i=handlerInfos.length-1; i>=0; i--) {
    var handlerInfo = handlerInfos[i],
        handler = handlerInfo.handler;

    if (handler._actions && handler._actions[name]) {
      if (handler._actions[name].apply(handler, args) === true) {
        eventWasHandled = true;
      } else {
        return;
      }
    } else if (handler.events && handler.events[name]) {
      Ember.deprecate('Action handlers contained in an `events` object are deprecated in favor of putting them in an `actions` object (' + name + ' on ' + handler + ')', false);
      if (handler.events[name].apply(handler, args) === true) {
        eventWasHandled = true;
      } else {
        return;
      }
    }
  }

  if (!eventWasHandled && !ignoreFailure) {
    throw new Error("Nothing handled the event '" + name + "'.");
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

  _defaultErrorHandler: function(error, transition) {
    Ember.Logger.error('Error while loading route:', error);

    // Using setTimeout allows us to escape from the Promise's try/catch block
    setTimeout(function() { throw error; });
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

