var get = Ember.get, set = Ember.set;

Ember.State = Ember.Object.extend({
  isState: true,
  parentState: null,
  start: null,

  init: function() {
    Ember.keys(this).forEach(function(name) {
      var value = this[name];

      if (value && value.isState) {
        set(value, 'parentState', this);
        set(value, 'name', (get(this, 'name') || '') + '.' + name);
      }
    }, this);
  },

  enter: Ember.K,
  exit: Ember.K
});
