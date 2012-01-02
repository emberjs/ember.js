var get = Ember.get, set = Ember.set;

Ember.TargetActionSupport = Ember.Mixin.create({
  target: null,
  action: null,

  targetObject: Ember.computed(function() {
    var target = get(this, 'target');

    if (Ember.typeOf(target) === "string") {
      var obj = Ember.getPath(this, target);
      if (Ember.none(obj)) {
        // if the target cannot be found, try to get it as a global object
        obj = Ember.getPath(target);
      }
      return obj;
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
