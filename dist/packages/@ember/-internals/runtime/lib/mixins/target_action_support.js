/**
@module ember
*/
import { context } from '@ember/-internals/environment';
import { get, computed } from '@ember/-internals/metal';
import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
const TargetActionSupport = Mixin.create({
  target: null,
  action: null,
  actionContext: null,
  actionContextObject: computed('actionContext', function () {
    let actionContext = get(this, 'actionContext');
    if (typeof actionContext === 'string') {
      let value = get(this, actionContext);
      if (value === undefined) {
        value = get(context.lookup, actionContext);
      }
      return value;
    } else {
      return actionContext;
    }
  }),
  /**
  Send an `action` with an `actionContext` to a `target`. The action, actionContext
  and target will be retrieved from properties of the object. For example:
     ```javascript
  import { alias } from '@ember/object/computed';
     App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: alias('controller'),
    action: 'save',
    actionContext: alias('context'),
    click() {
      this.triggerAction(); // Sends the `save` action, along with the current context
                            // to the current controller
    }
  });
  ```
     The `target`, `action`, and `actionContext` can be provided as properties of
  an optional object argument to `triggerAction` as well.
     ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    click() {
      this.triggerAction({
        action: 'save',
        target: this.get('controller'),
        actionContext: this.get('context')
      }); // Sends the `save` action, along with the current context
          // to the current controller
    }
  });
  ```
     The `actionContext` defaults to the object you are mixing `TargetActionSupport` into.
  But `target` and `action` must be specified either as properties or with the argument
  to `triggerAction`, or a combination:
     ```javascript
  import { alias } from '@ember/object/computed';
     App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: alias('controller'),
    click() {
      this.triggerAction({
        action: 'save'
      }); // Sends the `save` action, along with a reference to `this`,
          // to the current controller
    }
  });
  ```
     @method triggerAction
  @param opts {Object} (optional, with the optional keys action, target and/or actionContext)
  @return {Boolean} true if the action was sent successfully and did not return false
  @private
  */
  triggerAction(opts = {}) {
    let {
      action,
      target,
      actionContext
    } = opts;
    action = action || get(this, 'action');
    target = target || getTarget(this);
    if (actionContext === undefined) {
      actionContext = get(this, 'actionContextObject') || this;
    }
    let context = Array.isArray(actionContext) ? actionContext : [actionContext];
    if (target && action) {
      let ret;
      if (isSendable(target)) {
        ret = target.send(action, ...context);
      } else {
        assert(`The action '${action}' did not exist on ${target}`, typeof target[action] === 'function');
        ret = target[action](...context);
      }
      if (ret !== false) {
        return true;
      }
    }
    return false;
  }
});
function isSendable(obj) {
  return obj != null && typeof obj === 'object' && typeof obj.send === 'function';
}
function getTarget(instance) {
  let target = get(instance, 'target');
  if (target) {
    if (typeof target === 'string') {
      let value = get(instance, target);
      if (value === undefined) {
        value = get(context.lookup, target);
      }
      return value;
    } else {
      return target;
    }
  }
  if (instance._target) {
    return instance._target;
  }
  return null;
}
if (DEBUG) {
  Object.seal(TargetActionSupport);
}
export default TargetActionSupport;