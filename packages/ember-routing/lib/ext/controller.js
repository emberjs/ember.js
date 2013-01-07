var get = Ember.get;

Ember.ControllerMixin.reopen({
  concatenatedProperties: ['needs'],
  needs: [],

  init: function() {
    this._super.apply(this, arguments);

    // Structure asserts to still do verification but not string concat in production
    if(!verifyDependencies(this)) {
      Ember.assert("Missing dependencies", false);
    }
  },

  transitionTo: function() {
    var router = get(this, 'target');

    return router.transitionTo.apply(router, arguments);
  },

  controllerFor: function(controllerName) {
    var container = get(this, 'container');
    return container.lookup('controller:' + controllerName);
  }
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
