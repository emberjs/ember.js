var Router = requireModule("router");
var get = Ember.get, set = Ember.set, classify = Ember.String.classify;

var DefaultView = Ember.View.extend(Ember._Metamorph);

Ember.Router = Ember.Object.extend({
  location: 'hash',

  init: function() {
    var router = this.router = new Router(),
        self = this, handlers = {};

    // This is a temporary implementation. Apps should go through
    // the `lookup` API and not try to use this data structure
    // directly.
    var container = this._container = {
      view: {},
      controller: {}
    };

    var activeViews = this._activeViews = {};

    var location = get(this, 'location'),
        rootURL = get(this, 'rootURL');

    if ('string' === typeof location) {
      location = set(this, 'location', Ember.Location.create({
        implementation: location,
        rootURL: rootURL
      }));
    }

    Ember.assert("You must call " + this.constructor.toString() + ".map() before your application is initialized", this.constructor.callback);
    router.map(this.constructor.callback);
  },

  startRouting: function() {
    var router = this.router,
        location = get(this, 'location');

    router.getHandler = getHandlerFunction(this, this._container, this._activeViews);
    router.updateURL = function() {
      location.setURL.apply(location, arguments);
    };

    if (!this._container.view.application) {
      this._container.view.application = DefaultView.create({
        templateName: 'application'
      });
    }

    router.handleURL(location.getURL());
    location.onUpdateURL(function(url) {
      router.handleURL(url);
    });
  },

  handleURL: function(url) {
    this.router.handleURL(url);
  },

  transitionTo: function() {
    this.router.transitionTo.apply(this.router, arguments);
  },

  generate: function() {
    return this.router.generate.apply(this.router, arguments);
  },

  send: function(name, context) {
    if (Ember.$ && context instanceof Ember.$.Event) {
      context = context.context;
    }

    this.router.trigger(name, context);
  }
});

function getHandlerFunction(router, container, activeViews) {
  var handlers = {}, namespace = get(router, 'namespace');

  return function(name) {
    if (handlers.hasOwnProperty(name)) {
      return handlers[name];
    }

    var className = classify(name) + "Route",
        handler = get(namespace, className);

    if (!handler) {
      if (name === 'loading') { return {}; }
      else { handler = Ember.Route.extend(); }
    }

    //Ember.assert("Your router tried to route a URL to " + name + ", but " + namespace.toString() + "." + className + " did not exist.", handler);

    return handlers[name] = handler.create({
      router: router,
      templateName: name
    });
  };
}

Ember.Router.reopenClass({
  map: function(callback) {
    this.callback = callback;
  }
});
