var get = Ember.get, set = Ember.set, a_slice = Array.prototype.slice;

/** @private */
function xform(target, method, params) {
  var args = a_slice.call(params, 2);
  method.apply(target, args);
}

Ember.Evented = Ember.Mixin.create({
  on: function(name, target, method) {
    if (!method) {
      method = target;
      target = null;
    }

    Ember.addListener(this, name, target, method, xform);
  },

  fire: function(name) {
    Ember.deprecate("Ember.Evented#fire() has been deprecated in favor of trigger() for compatibility with jQuery. It will be removed in 1.0. Please update your code to call trigger() instead.", Ember.ENV.EVENTED_FIRE !== '1.0');
    Ember.sendEvent.apply(null, [this, name].concat(a_slice.call(arguments, 1)));
  },

  trigger: function(name) {
    Ember.sendEvent.apply(null, [this, name].concat(a_slice.call(arguments, 1)));
  },

  off: function(name, target, method) {
    Ember.removeListener(this, name, target, method);
  }
});
