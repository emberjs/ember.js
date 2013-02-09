/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

Ember.ControllerMixin.reopen({
  transitionToRoute: function() {
    // target may be either another controller or a router
    var target = get(this, 'target'),
        method = target.transitionToRoute || target.transitionTo;
    return method.apply(target, arguments);
  },

  transitionTo: function() {
    Ember.deprecate("transitionTo is deprecated. Please use transitionToRoute.");
    return this.transitionToRoute.apply(this, arguments);
  },

  replaceRoute: function() {
    // target may be either another controller or a router
    var target = get(this, 'target'),
        method = target.replaceRoute || target.replaceWith;
    return method.apply(target, arguments);
  },

  replaceWith: function() {
    Ember.deprecate("replaceWith is deprecated. Please use replaceRoute.");
    return this.replaceRoute.apply(this, arguments);
  }
});
