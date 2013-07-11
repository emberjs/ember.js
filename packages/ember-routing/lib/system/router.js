/**
@module ember
@submodule ember-routing
*/

var Router = requireModule("router");
var get = Ember.get, set = Ember.set;
var defineProperty = Ember.defineProperty;

var DefaultView = Ember._MetamorphView;

require("ember-routing/system/dsl");

function setupLocation(router) {
  var location = get(router, 'location'),
      rootURL = get(router, 'rootURL'),
      options = {};

  if (typeof rootURL === 'string') {
    options.rootURL = rootURL;
  }

  if ('string' === typeof location) {
    options.implementation = location;
    location = set(router, 'location', Ember.Location.create(options));

  }
}

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
    setupLocation(this);
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

    setupRouter(this, router, location);

    container.register('view:default', DefaultView);
    container.register('view:toplevel', Ember.View.extend());

    location.onUpdateURL(function(url) {
      self.handleURL(url);
    });

    this.handleURL(location.getURL());
  },

  didTransition: function(infos) {
    var appController = this.container.lookup('controller:application'),
        path = routePath(infos);

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
    scheduleLoadingStateEntry(this);

    var self = this;

    return this.router.handleURL(url).then(function() {
      transitionCompleted(self);
    });
  },

  transitionTo: function() {
    return doTransition(this, 'transitionTo', arguments);
  },

  replaceWith: function() {
    return doTransition(this, 'replaceWith', arguments);
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
  }
});

function getHandlerFunction(router) {
  var seen = {}, container = router.container,
      DefaultRoute = container.resolve('route:basic');

  return function(name) {
    var routeName = 'route:' + name,
        handler = container.lookup(routeName);

    if (seen[name]) { return handler; }

    seen[name] = true;

    if (!handler) {
      if (name === 'loading') { return {}; }

      container.register(routeName, DefaultRoute.extend());
      handler = container.lookup(routeName);

      if (get(router, 'namespace.LOG_ACTIVE_GENERATION')) {
        Ember.Logger.info("generated -> " + routeName, { fullName: routeName });
      }
    }

    if (name === 'application') {
      // Inject default `error` handler.
      handler.events = handler.events || {};
      handler.events.error = handler.events.error || defaultErrorHandler;
    }

    handler.routeName = name;
    return handler;
  };
}

function defaultErrorHandler(error, transition) {
  Ember.Logger.error('Error while loading route:', error);

  // Using setTimeout allows us to escape from the Promise's try/catch block
  setTimeout(function() { throw error; });
}


function routePath(handlerInfos) {
  var path = [];

  for (var i=1, l=handlerInfos.length; i<l; i++) {
    var name = handlerInfos[i].name,
        nameParts = name.split(".");

    path.push(nameParts[nameParts.length - 1]);
  }

  return path.join(".");
}

function setupRouter(emberRouter, router, location) {
  var lastURL;

  router.getHandler = getHandlerFunction(emberRouter);

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
}

function doTransition(router, method, args) {
  // Normalize blank route to root URL.
  args = [].slice.call(args);
  args[0] = args[0] || '/';

  var passedName = args[0], name;

  if (passedName.charAt(0) === '/') {
    name = passedName;
  } else {
    if (!router.router.hasRoute(passedName)) {
      name = args[0] = passedName + '.index';
    } else {
      name = passedName;
    }

    Ember.assert("The route " + passedName + " was not found", router.router.hasRoute(name));
  }

  scheduleLoadingStateEntry(router);

  var transitionPromise = router.router[method].apply(router.router, args);
  transitionPromise.then(function() {
    transitionCompleted(router);
  }, function() {
    exitLoadingState(router);
  });

  // We want to return the configurable promise object
  // so that callers of this function can use `.method()` on it,
  // which obviously doesn't exist for normal RSVP promises.
  return transitionPromise;
}

function scheduleLoadingStateEntry(router) {
  if (router._loadingStateActive) { return; }
  router._shouldEnterLoadingState = true;
  Ember.run.scheduleOnce('routerTransitions', null, enterLoadingState, router);
}

function enterLoadingState(router) {
  if (router._loadingStateActive || !router._shouldEnterLoadingState) { return; }

  var loadingRoute = router.router.getHandler('loading');
  if (loadingRoute) {
    if (loadingRoute.enter) { loadingRoute.enter(); }
    if (loadingRoute.setup) { loadingRoute.setup(); }
    router._loadingStateActive = true;
  }
}

function exitLoadingState(router) {
  router._shouldEnterLoadingState = false;
  if (!router._loadingStateActive) { return; }

  var loadingRoute = router.router.getHandler('loading');
  if (loadingRoute && loadingRoute.exit) { loadingRoute.exit(); }
  router._loadingStateActive = false;
}

function transitionCompleted(router) {
  router.notifyPropertyChange('url');
  exitLoadingState(router);
}

Ember.Router.reopenClass({
  map: function(callback) {
    var router = this.router;
    if (!router){
      router = this.router = new Router();
      router.callbacks = [];
    }

    if (get(this, 'namespace.LOG_TRANSITIONS_INTERNAL')) {
      router.log = Ember.Logger.debug;
    }

    var dsl = Ember.RouterDSL.map(function() {
      this.resource('application', { path: "/" }, function() {
        for (var i=0; i < router.callbacks.length; i++){
          router.callbacks[i].call(this);
        }
        callback.call(this);
      });
    });

    router.callbacks.push(callback);
    router.map(dsl.generate());
    return router;
  }
});

