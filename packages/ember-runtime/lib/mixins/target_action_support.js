var get = Ember.get, set = Ember.set, getPath = Ember.getPathWithoutDeprecation;

Ember.TargetActionSupport = Ember.Mixin.create({
  target: null,
  action: null,

  targetObject: Ember.computed(function() {
    var target = get(this, 'target');

    if (Ember.typeOf(target) === "string") {
      var value = getPath(this, target);
      if (value === undefined) { value = getPath(window, target); }
      return value;
    } else {
      return target;
    }
  }).property('target').cacheable(),

  triggerAction: function() {
    var sendLevel = Ember.ENV.ACTION_VIA_SEND,
        useSend = sendLevel !== '1.0',
        warnOnSend = sendLevel === 'warn',
        action = get(this, 'action'),
        target = get(this, 'targetObject');

    if (target && action) {
      var ret;

      if (useSend && typeof target.send === 'function') {
        Ember.deprecate('The action helper will not delegate to send in Ember 1.0.', !warnOnSend);
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
