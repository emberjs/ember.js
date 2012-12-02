var Router = requireModule("router");
var get = Ember.get, set = Ember.set, classify = Ember.String.classify;

Ember.Router = Ember.Object.extend({
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

    router.map(this.constructor.callback);
    router.getHandler = getHandlerFunction(this, container);
  },

  handleURL: function(url) {
    this.router.handleURL(url);
  }
});

function getHandlerFunction(router, container) {
  var handlers = {}, namespace = get(router, 'namespace');

  return function(name) {
    if (handlers.hasOwnProperty(name)) {
      return handlers[name];
    }

    var className = classify(name) + "Route",
        handler = get(namespace, className);

    if (!handler && name === 'loading') {
      return {};
    }

    Ember.assert("Your router tried to route a URL to " + name + ", but " + namespace.toString() + "." + className + " did not exist.", handler);

    return handlers[name] = handler.create({
      templateName: name,
      namespace: namespace,
      _container: container
    });
  };
}

Ember.Router.reopenClass({
  map: function(callback) {
    this.callback = callback;
  }
});
