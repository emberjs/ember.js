var get = Ember.get, set = Ember.set;

Ember.State = Ember.Object.extend({
  isState: true,
  parentState: null,
  start: null,

  init: function() {
    var states = get(this, 'states'), findStates = false;

    if (!states) { states = {}; findStates = true; }
    Ember.keys(this).forEach(function(name) {
      var value = this[name];

      if (value && value.isState) {
        set(value, 'parentState', this);
        set(value, 'name', (get(this, 'name') || '') + '.' + name);

        if (findStates) { states[name] = value; }
      }
    }, this);

    if (findStates) { set(this, 'states', states); }
  },

  enter: Ember.K,
  exit: Ember.K
});
