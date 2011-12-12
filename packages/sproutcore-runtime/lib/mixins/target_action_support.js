var get = Ember.get, set = Ember.set;

Ember.TargetActionSupport = Ember.Mixin.create({
  target: null,
  action: null,

  targetObject: Ember.computed(function() {
    var target = get(this, 'target');

    if (Ember.typeOf(target) === "string") {
      return Ember.getPath(this, target);
    } else {
      return target;
    }
  }).property('target').cacheable(),

  triggerAction: function() {
    var action = get(this, 'action'),
        target = get(this, 'targetObject');

    if (target && action) {
      if (typeof target.send === 'function') {
        target.send(action, this);
      } else {
        if (typeof action === 'string') {
          action = target[action];
        }
        action.call(target, this);
      }
    }
  }
});
