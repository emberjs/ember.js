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
    var activeViews = this._activeViews = {};

    setupLocation(this);

    Ember.assert("You must call " + this.constructor.toString() + ".map() before your application is initialized", this.constructor.callback);
    router.map(this.constructor.callback);
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

    if (!container.lookup('view:application')) {
      container.register('view', 'application', DefaultView.create({
        templateName: 'application'
      }));
    }

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
    return this.router.generate.apply(this.router, arguments);
  },

  isActive: function(routeName) {
    return handlerIsActive(this, routeName);
  },

  send: function(name, context) {
    if (Ember.$ && context instanceof Ember.$.Event) {
      context = context.context;
    }

    this.router.trigger(name, context);
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
