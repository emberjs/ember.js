/**
 @class

 @extends Ember.Mixin
 */
Ember.Evented = Ember.Mixin.create(
  /** @scope Ember.Evented.prototype */ {
  on: function(name, target, method) {
    Ember.addListener(this, name, target, method);
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
    var args = [], i, l;
    for (i = 1, l = arguments.length; i < l; i++) {
      args.push(arguments[i]);
    }
    Ember.sendEvent(this, name, args);
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
