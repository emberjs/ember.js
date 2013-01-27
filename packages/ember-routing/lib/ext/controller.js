/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

Ember.ControllerMixin.reopen({
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

  model: Ember.computed(function(key, value) {
    if (arguments.length > 1) {
      return set(this, 'content', value);
    } else {
      return get(this, 'content');
    }
  }).property('content')
});
