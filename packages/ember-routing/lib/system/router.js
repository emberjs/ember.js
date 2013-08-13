/**
@module ember
@submodule ember-routing
*/

var Router = requireModule("router");
var get = Ember.get, set = Ember.set;
var defineProperty = Ember.defineProperty,
    removeObserver = Ember.removeObserver,
    addObserver = Ember.addObserver;

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
  titleDivider: ' - ',

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

  /**
    @private

    Updates the current document's title based off the title properties in all
    the current route handlers.

    @method updateTitle
  */
  updateTitle: (function () {
    var originalTitle = document.title;

    return function () {
      var currentHandlerInfos = get(this, 'router.currentHandlerInfos'),
          parts = [];

      for (var part, i = 0, l = currentHandlerInfos.length; i < l; i++) {
          part = get(currentHandlerInfos[i].handler, 'title');
          if (part) {
              parts.push(part);
          }
      }

      var newTitle = parts.reverse().join(get(this, 'titleDivider'));

      document.title = newTitle || originalTitle;
    };
  })(),

  willTransition: function(infos) {
    var oldInfos = get(this, 'router.currentHandlerInfos');
    
    if (oldInfos) {
      for (var part, i = 0, l = oldInfos.length; i < l; i++) {
        removeObserver(oldInfos[i].handler, 'title', this, this.updateTitle);
      }
    }
  },

  didTransition: function(infos) {
    var appController = this.container.lookup('controller:application'),
        path = Ember.Router._routePath(infos);

    for (var part, i = 0, l = infos.length; i < l; i++) {
      addObserver(infos[i].handler, 'title', this, this.updateTitle);
    }

    this.updateTitle();

    if (!('currentPath' in appController)) {
      defineProperty(appController, 'currentPath');
    }
    set(appController, 'currentPath', path);
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
        DefaultRoute = container.resolve('route:basic'),
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

    router.willTransition = function(infos) {
      emberRouter.willTransition(infos);
    };

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

Ember.Router.reopenClass({
  map: function(callback) {
    var router = this.router;
    if (!router) {
      router = this.router = new Router();
      router.callbacks = [];
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

