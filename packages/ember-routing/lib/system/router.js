var Router = requireModule("router");
var get = Ember.get, set = Ember.set, classify = Ember.String.classify;

var DefaultView = Ember.View.extend(Ember._Metamorph);

function setupLocation(router) {
  var location = get(router, 'location'),
      rootURL = get(router, 'rootURL');

  if ('string' === typeof location) {
    set(router, 'location', Ember.Location.create({
      implementation: location,
      rootURL: rootURL
    }));
  }
}

Ember.Router = Ember.Object.extend({
  location: 'hash',

  init: function() {
    var router = this.router = new Router();
    this._activeViews = {};

    setupLocation(this);

    var callback = this.constructor.callback;

    router.map(function(match) {
      match("/").to("application", callback);
    });
  },

  startRouting: function() {
    var router = this.router,
        location = get(this, 'location'),
        container = this.container;

    var lastURL;

    function updateURL() {
      location.setURL(lastURL);
    }

    router.getHandler = getHandlerFunction(this, this._activeViews);
    router.updateURL = function(path) {
      lastURL = path;
      Ember.run.once(updateURL);
    };

    container.register('view', 'default', DefaultView);
    container.register('view', 'toplevel', Ember.View.extend());

    router.handleURL(location.getURL());
    location.onUpdateURL(function(url) {
      router.handleURL(url);
    });
  },

  handleURL: function(url) {
    this.router.handleURL(url);
    this.notifyPropertyChange('url');
  },

  transitionTo: function() {
    this.router.transitionTo.apply(this.router, arguments);
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

  _lookupActiveView: function(templateName) {
    return this._activeViews[templateName];
  },

  _connectActiveView: function(templateName, view) {
    this._activeViews[templateName] = view;
    view.one('willDestroyElement', this, function() {
      if (this._activeViews[templateName] === view){
        delete this._activeViews[templateName];
      }
    });
  }
});

function getHandlerFunction(router, activeViews) {
  var seen = {}, container = router.container;

  return function(name) {
    var handler = container.lookup('route:' + name);
    if (seen[name]) { return handler; }

    seen[name] = true;

    if (!handler) {
      if (name === 'loading') { return {}; }

      container.register('route', name, Ember.Route.extend());
      handler = container.lookup('route:' + name);
    }

    handler.templateName = name;
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

Ember.Router.reopenClass({
  map: function(callback) {
    this.callback = callback;
  }
});
