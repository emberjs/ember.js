Ember.Evented = Ember.Mixin.create({
  on: function(name, target, method) {
    Ember.addListener(this, name, target, method);
  },

  fire: function(name) {
    var args = [], i, l;
    for (i = 1, l = arguments.length; i < l; i++) {
      args.push(arguments[i]);
    }
    Ember.sendEvent(this, name, args);
  },

  off: function(name, target, method) {
    Ember.removeListener(this, name, target, method);
  },

  has: function(name) {
    return Ember.hasListeners(this, name);
  }
});
