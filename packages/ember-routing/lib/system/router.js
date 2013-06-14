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
    this.router.handleURL(url);
    this.notifyPropertyChange('url');
  },

  /**
    Transition to another route via the `routeTo` event which
    will by default be handled by ApplicationRoute.

    @method routeTo
    @param {TransitionEvent} transitionEvent
   */
  routeTo: function(transitionEvent) {
    var handlerInfos = this.router.currentHandlerInfos;
    if (handlerInfos) {
      transitionEvent.sourceRoute = handlerInfos[handlerInfos.length - 1].handler;
    }

    this.send('routeTo', transitionEvent);
  },

  transitionTo: function(name) {
    var args = [].slice.call(arguments);
    doTransition(this, 'transitionTo', args);
  },

  replaceWith: function() {
    var args = [].slice.call(arguments);
    doTransition(this, 'replaceWith', args);
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

Ember.Router.reopenClass({
  defaultFailureHandler: {
    setup: function(error) {
      Ember.Logger.error('Error while loading route:', error);

      // Using setTimeout allows us to escape from the Promise's try/catch block
      setTimeout(function() { throw error; });
    }
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
      if (name === 'failure') { return router.constructor.defaultFailureHandler; }

      container.register(routeName, DefaultRoute.extend());
      handler = container.lookup(routeName);

      if (get(router, 'namespace.LOG_ACTIVE_GENERATION')) {
        Ember.Logger.info("generated -> " + routeName, { fullName: routeName });
      }
    }

    if (name === 'application') {
      // Inject default `routeTo` handler.
      handler.events = handler.events || {};
      handler.events.routeTo = handler.events.routeTo || Ember.TransitionEvent.defaultHandler;
    }

    handler.routeName = name;
    return handler;
  };
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
  var passedName = args[0], name;

  if (!router.router.hasRoute(args[0])) {
    name = args[0] = passedName + '.index';
  } else {
    name = passedName;
  }

  Ember.assert("The route " + passedName + " was not found", router.router.hasRoute(name));

  router.router[method].apply(router.router, args);
  router.notifyPropertyChange('url');
}

Ember.Router.reopenClass({
  map: function(callback) {
      // Make sure the mapCallbacks exists
      if (this.mapCallbacks == null) {
          this.mapCallbacks = [];
      }
      this.mapCallbacks.push(callback);

      var router = this.router,
          self = this;
      if (this.router === undefined) {
          router = this.router = new Router();
      }

      var dsl = Ember.RouterDSL.map(function() {
          this.resource('application', { path: "/" }, function() {
              for (var cb_i = 0, cb_l = self.mapCallbacks.length; cb_i < cb_l; cb_i++) {
                  self.mapCallbacks[cb_i].call(this);
              }
          });
      });

      router.map(dsl.generate());
      return router;
  }
});
