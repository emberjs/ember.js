var get = Ember.get;

Ember._ResolvedState = Ember.Object.extend({
  manager: null,
  state: null,
  match: null,

  object: Ember.computed(function(key) {
    if (this._object) {
      return this._object;
    } else {
      var state = get(this, 'state'),
          match = get(this, 'match'),
          manager = get(this, 'manager');
      return state.deserialize(manager, match.hash);
    }
  }),

  hasPromise: Ember.computed(function() {
    return Ember.canInvoke(get(this, 'object'), 'then');
  }).property('object'),

  promise: Ember.computed(function() {
    var object = get(this, 'object');
    if (Ember.canInvoke(object, 'then')) {
      return object;
    } else {
      return {
        then: function(success) { success(object); }
      };
    }
  }).property('object'),

  transition: function() {
    var manager = get(this, 'manager'),
        path = get(this, 'state.path'),
        object = get(this, 'object');
    manager.transitionTo(path, object);
  }
});
