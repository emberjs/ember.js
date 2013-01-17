/**
@module ember
@submodule ember-routing
*/

var Router = requireModule("router");
var get = Ember.get, set = Ember.set, classify = Ember.String.classify;

var DefaultView = Ember.View.extend(Ember._Metamorph);

require("ember-routing/system/dsl");

function setupLocation(router) {
  var location = get(router, 'location'),
      rootURL = get(router, 'rootURL');

  if ('string' === typeof location) {
    location = set(router, 'location', Ember.Location.create({
      implementation: location
    }));

    if (typeof rootURL === 'string') {
      set(location, 'rootURL', rootURL);
    }
  }
}

Ember.Router = Ember.Object.extend({
  location: 'hash',

  init: function() {
    this.router = this.constructor.router;
    this._activeViews = {};
    setupLocation(this);
  },

  startRouting: function() {
    this.router = this.router || this.constructor.map(Ember.K);

    var router = this.router,
        location = get(this, 'location'),
        container = this.container,
        self = this;

    setupRouter(this, router, location);

    container.register('view', 'default', DefaultView);
    container.register('view', 'toplevel', Ember.View.extend());

    router.handleURL(location.getURL());
    location.onUpdateURL(function(url) {
      router.handleURL(url);
    });
  },

  didTransition: function(infos) {
    // Don't do any further action here if we redirected
    if (infos[infos.length-1].handler.transitioned) { return; }

    var appController = this.container.lookup('controller:application'),
        path = routePath(infos);

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

  transitionTo: function(passedName) {
    var args = [].slice.call(arguments), name;

    if (!this.router.hasRoute(passedName)) {
      name = args[0] = passedName + '.index';
    } else {
      name = passedName;
    }

    Ember.assert("The route " + passedName + " was not found", this.router.hasRoute(name));

    this.router.transitionTo.apply(this.router, args);
    this.notifyPropertyChange('url');
  },

  replaceWith: function() {
    this.router.replaceWith.apply(this.router, arguments);
    this.notifyPropertyChange('url');
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
    if (Ember.$ && context instanceof Ember.$.Event) {
      context = context.context;
    }

    this.router.trigger(name, context);
  },

  hasRoute: function(route) {
    return this.router.hasRoute(route);
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
  var seen = {}, container = router.container;

  return function(name) {
    var handler = container.lookup('route:' + name);
    if (seen[name]) { return handler; }

    seen[name] = true;

    if (!handler) {
      if (name === 'loading') { return {}; }
      if (name === 'failure') { return router.constructor.defaultFailureHandler; }

      container.register('route', name, Ember.Route.extend());
      handler = container.lookup('route:' + name);
    }

    handler.routeName = name;
    return handler;
  };
}

function handlerIsActive(router, handlerName) {
  var handler = router.container.lookup('route:' + handlerName),
      currentHandlerInfos = router.router.currentHandlerInfos,
      handlerInfo;

  for (var i=0, l=currentHandlerInfos.length; i<l; i++) {
    handlerInfo = currentHandlerInfos[i];
    if (handlerInfo.handler === handler) { return true; }
  }

  return false;
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

Ember.Router.reopenClass({
  map: function(callback) {
    var router = this.router = new Router();

    var dsl = Ember.RouterDSL.map(function() {
      this.resource('application', { path: "/" }, function() {
        callback.call(this);
      });
    });

    router.map(dsl.generate());
    return router;
  }
});
