/**
@module ember
@submodule ember-runtime
*/

import { context } from 'ember-environment';
import { assert } from 'ember-debug';
import {
  get,
  Mixin,
  computed
} from 'ember-metal';

/**
`Ember.TargetActionSupport` is a mixin that can be included in a class
to add a `triggerAction` method with semantics similar to the Handlebars
`{{action}}` helper. In normal Ember usage, the `{{action}}` helper is
usually the best choice. This mixin is most often useful when you are
doing more complex event handling in Components.

@class TargetActionSupport
@namespace Ember
@extends Ember.Mixin
@private
*/
export default Mixin.create({
  target: null,
  action: null,
  actionContext: null,

  actionContextObject: computed('actionContext', function() {
    let actionContext = get(this, 'actionContext');

    if (typeof actionContext === 'string') {
      let value = get(this, actionContext);
      if (value === undefined) { value = get(context.lookup, actionContext); }
      return value;
    } else {
      return actionContext;
    }
  }),

  /**
  Send an `action` with an `actionContext` to a `target`. The action, actionContext
  and target will be retrieved from properties of the object. For example:

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: Ember.computed.alias('controller'),
    action: 'save',
    actionContext: Ember.computed.alias('context'),
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
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: Ember.computed.alias('controller'),
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
    let action = opts.action || get(this, 'action');
    let target = opts.target;

    if (!target) {
      target = getTarget(this);
    }

    let actionContext = opts.actionContext;

    function args(options, actionName) {
      let ret = [];
      if (actionName) { ret.push(actionName); }

      return ret.concat(options);
    }

    if (typeof actionContext === 'undefined') {
      actionContext = get(this, 'actionContextObject') || this;
    }

    if (target && action) {
      let ret;

      if (target.send) {
        ret = target.send(...args(actionContext, action));
      } else {
        assert(`The action '${action}' did not exist on ${target}`, typeof target[action] === 'function');
        ret = target[action](...args(actionContext));
      }

      if (ret !== false) {
        ret = true;
      }

      return ret;
    } else {
      return false;
    }
  }
});

function getTarget(instance) {
  // TODO: Deprecate specifying `targetObject`
  let target = get(instance, 'targetObject');

  // if a `targetObject` CP was provided, use it
  if (target) { return target; }

  // if _targetObject use it
  if (instance._targetObject) { return instance._targetObject; }

  target = get(instance, 'target');
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

  return null;
}
