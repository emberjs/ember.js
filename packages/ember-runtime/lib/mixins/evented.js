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
    Ember.sendEvent.apply(null, [this, name].concat(a_slice.call(arguments, 1)));
  },

  off: function(name, target, method) {
    Ember.removeListener(this, name, target, method);
  }
});
