/**
@module ember
*/

import { DeprecatedMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import { DEBUG } from '@glimmer/env';
import InternalTargetActionSupport from '@ember/-internals/runtime/lib/mixins/target_action_support-internal';

/**
`TargetActionSupport` is a mixin that can be included in a class
to add a `triggerAction` method with semantics similar to the
`{{action}}` helper. In normal Ember usage, the `{{action}}` helper is
usually the best choice. This mixin is most often useful when you are
doing more complex event handling in Components.

@class TargetActionSupport
@namespace Ember
@extends Mixin
@private
@deprecated Use a direct method call or closure action instead.
*/
interface TargetActionSupport {
  target: unknown;
  action: string | null;
  actionContext: unknown;
  actionContextObject: unknown;
  /**
  The following is private and vestigial.
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
  @deprecated Use a direct method call or closure action instead.
  @param opts {Object} (optional, with the optional keys action, target and/or actionContext)
  @return {Boolean} true if the action was sent successfully and did not return false
  @private
  */
  triggerAction(opts?: object): unknown;

  /** @internal */
  _target?: unknown;
}
const TargetActionSupport = DeprecatedMixin.create(InternalTargetActionSupport, {
  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `TargetActionSupport` mixin is deprecated. Invoke the target method directly instead.',
      DEPRECATIONS.DEPRECATE_TARGET_ACTION_SUPPORT
    );
  },
});

if (DEBUG) {
  Object.seal(TargetActionSupport);
}

export default TargetActionSupport;
