var get = Ember.get, set = Ember.set, a_slice = Array.prototype.slice;

/** @private */
function xform(target, method, params) {
  var args = a_slice.call(params, 2);
  method.apply(target, args);
}

/**
 @class

 @extends Ember.Mixin
 */
Ember.Evented = Ember.Mixin.create(
  /** @scope Ember.Evented.prototype */ {
  on: function(name, target, method) {
    if (!method) {
      method = target;
      target = null;
    }

    Ember.addListener(this, name, target, method, xform);
  },

  one: function(name, target, method) {
    if (!method) {
      method = target;
      target = null;
    }

    var self = this;
    var wrapped = function() {
      Ember.removeListener(self, name, target, wrapped);

      if ('string' === typeof method) { method = this[method]; }

      // Internally, a `null` target means that the target is
      // the first parameter to addListener. That means that
      // the `this` passed into this function is the target
      // determined by the event system.
      method.apply(this, arguments);
    };

    this.on(name, target, wrapped);
  },

  trigger: function(name) {
   Ember.sendEvent.apply(null, [this, name].concat(a_slice.call(arguments, 1)));
  },

  fire: function(name) {
    Ember.deprecate("Ember.Evented#fire() has been deprecated in favor of trigger() for compatibility with jQuery. It will be removed in 1.0. Please update your code to call trigger() instead.");
    this.trigger.apply(this, arguments);
  },

  off: function(name, target, method) {
    Ember.removeListener(this, name, target, method);
  },

  has: function(name) {
    return Ember.hasListeners(this, name);
  }
});
