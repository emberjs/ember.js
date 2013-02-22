/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set;

/**
@class TargetActionSupport
@namespace Ember
@extends Ember.Mixin
*/
Ember.TargetActionSupport = Ember.Mixin.create({
  triggerAction: function(name) {
    var action = getAction.call(this, name),
        target = getTarget.call(this, name);

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

function getAction(name) {
  var propName = name ? name+'Action' : 'action';
  return get(this, propName);
}

function getTarget(name) {
  var propName = name ? name+'Target' : 'target';
  var target = get(this, propName);
  if (Ember.typeOf(target) === "string") {
    return get(this, target) || get(Ember.lookup, target);
  }
  return target || get(this, 'controller');
}
