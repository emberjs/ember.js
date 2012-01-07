var get = Ember.get, set = Ember.set;

Ember.State = Ember.Object.extend({
  isState: true,
  parentState: null,
  start: null,

  init: function() {
    var states = get(this, 'states');

    if (!states) {
      states = {};
      for (var name in this) {
        var value = this[name];

        if (value && value.isState) {
          set(value, 'parentState', this);
          set(value, 'name', (get(this, 'name') || '') + '.' + name);

          states[name] = value;
        }
      }

      if (Ember.keys(states).length > 0) { set(this, 'states', states); }
    }

    set(this, 'routes', {});
  },

  enter: Ember.K,
  exit: Ember.K
});
