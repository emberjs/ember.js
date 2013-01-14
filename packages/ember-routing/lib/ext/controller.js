var get = Ember.get, set = Ember.set;

Ember.ControllerMixin.reopen({
  concatenatedProperties: ['needs'],
  needs: Em.A(),

  init: function() {
    this._super.apply(this, arguments);

    // Structure asserts to still do verification but not string concat in production
    if(!verifyDependencies(this)) {
      Ember.assert("Missing dependencies", false);
    }
  },

  transitionToRoute: function() {
    var router = get(this, 'target');

    return router.transitionTo.apply(router, arguments);
  },

  transitionTo: function() {
    Ember.deprecate("transitionTo is deprecated. Please use transitionToRoute.");
    return this.transitionToRoute.apply(this, arguments);
  },

  replaceRoute: function() {
    var router = get(this, 'target');

    return router.replaceWith.apply(router, arguments);
  },

  controllerFor: function(controllerName) {
    if ( this.needs.contains(controllerName) ){
      var container = get(this, 'container');
      return container.lookup('controller:' + controllerName);
    } else {
      return null;
    }
  },

  model: Ember.computed(function(key, value) {
    if (arguments.length > 1) {
      return set(this, 'content', value);
    } else {
      return get(this, 'content');
    }
  }).property('content')
});

function verifyDependencies(controller) {
  var needs = get(controller, 'needs'),
      container = get(controller, 'container'),
      dependency, satisfied = true;

  for (var i=0, l=needs.length; i<l; i++) {
    dependency = needs[i];
    if (dependency.indexOf(':') === -1) {
      dependency = "controller:" + dependency;
    }

    if (!container.has(dependency)) {
      satisfied = false;
      Ember.assert(this + " needs " + dependency + " but it does not exist", false);
    }
  }

  return satisfied;
}
