/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;
var ControllersProxy = Ember.Object.extend({
  controller: null,

  unknownProperty: function(controllerName) {
    var controller = get(this, 'controller'),
      needs = get(controller, 'needs'),
      container = controller.get('container'),
      dependency;

    for (var i=0, l=needs.length; i<l; i++) {
      dependency = needs[i];
      if (dependency === controllerName) {
        return container.lookup('controller:' + controllerName);
      }
    }
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
      Ember.assert(controller + " needs " + dependency + " but it does not exist", false);
    }
  }

  return satisfied;
}

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

  controllerFor: function(controllerName) {
    Ember.deprecate("Controller#controllerFor is deprecated, please use Controller#needs instead");
    var container = get(this, 'container');
    return container.lookup('controller:' + controllerName);
  },

  controllers: Ember.computed(function() {
    return ControllersProxy.create({ controller: this });
  })
});
