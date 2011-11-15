var get = SC.get, set = SC.set;

SC.TargetActionSupport = SC.Mixin.create({
  target: null,
  action: null,

  targetObject: function() {
    var target = get(this, 'target');

    if (SC.typeOf(target) === "string") {
      return SC.getPath(this, target);
    } else {
      return target;
    }
  }.property('target').cacheable(),

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
