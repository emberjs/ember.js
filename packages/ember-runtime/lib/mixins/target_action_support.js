var get = Ember.get, set = Ember.set, getPath = Ember.getPath, ROOT = Ember.ROOT;

Ember.TargetActionSupport = Ember.Mixin.create({
  target: null,
  action: null,

  targetObject: Ember.computed(function() {
    var target = get(this, 'target');

    if (Ember.typeOf(target) === "string") {
      // TODO: Remove the false when deprecation is done
      var value = getPath(this, target, false);
      if (value === undefined) { value = getPath(ROOT, target); }
      return value;
    } else {
      return target;
    }
  }).property('target').cacheable(),

  triggerAction: function() {
    var action = get(this, 'action'),
        target = get(this, 'targetObject');

    if (target && action) {
      var ret;

      if (typeof target.send === 'function') {
        ret = target.send(action, this);
      } else {
        if (typeof action === 'string') {
          action = target[action];
        }
        ret = action.call(target, this);
      }
      if (ret !== false) ret = true;

      return ret;
    } else {
      return false;
    }
  }
});
