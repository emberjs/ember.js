var get = Ember.get, set = Ember.set;

Ember.State = Ember.Object.extend({
  isState: true,
  parentState: null,
  start: null,

  init: function() {
    var states = get(this, 'states'), foundStates;

    // As a convenience, loop over the properties
    // of this state and look for any that are other
    // Ember.State instances or classes, and move them
    // to the `states` hash. This avoids having to
    // create an explicit separate hash.

    if (!states) {
      states = {};
      for (var name in this) {
        if (name === "constructor") { continue; }

        var value = this[name];
        if (!value) { continue; }

        if (Ember.State.detect(value)) {
          value = value.create();
        }

        if (value.isState) {
          foundStates = true;

          set(value, 'parentState', this);
          set(value, 'name', (get(this, 'name') || '') + '.' + name);

          states[name] = value;
        }
      }

      if (foundStates) { set(this, 'states', states); }
    }

    set(this, 'routes', {});
  },

  enter: Ember.K,
  exit: Ember.K
});
