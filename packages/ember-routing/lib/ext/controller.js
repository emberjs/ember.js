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
      dependency;

    for (var i=0, l=needs.length; i<l; i++) {
      dependency = needs[i];
      if (dependency === controllerName) {
        return controller.controllerFor(controllerName);
      }
    }
  }
});

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

  transitionToRoute: function() {
    var target = get(this, 'target');

    return target.transitionTo.apply(target, arguments);
  },

  // TODO: Deprecate this, see https://github.com/emberjs/ember.js/issues/1785
  transitionTo: function() {
    return this.transitionToRoute.apply(this, arguments);
  },

  replaceRoute: function() {
    var target = get(this, 'target');

    return target.replaceWith.apply(target, arguments);
  },

  // TODO: Deprecate this, see https://github.com/emberjs/ember.js/issues/1785
  replaceWith: function() {
    return this.replaceRoute.apply(this, arguments);
  },

  controllerFor: function(controllerName) {
    var container = get(this, 'container');
    return container.lookup('controller:' + controllerName);
  },

  model: Ember.computed(function(key, value) {
    if (arguments.length > 1) {
      return set(this, 'content', value);
    } else {
      return get(this, 'content');
    }
  }).property('content'),

  controllers: Ember.computed(function() {
    return ControllersProxy.create({ controller: this });
  })
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
