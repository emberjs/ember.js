/**
 @module ember
*/
import { DeprecatedMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import InternalActionSupport from '@ember/-internals/views/lib/mixins/action_support-internal';

/**
 @class ActionSupport
 @namespace Ember
 @private
 @deprecated Invoke the corresponding method directly instead.
*/
interface ActionSupport {
  /**
    Calls an action passed to a component.

    @method send
    @deprecated Invoke the corresponding method directly instead.
    @param {String} actionName The action to trigger
    @param {*} args Arguments to pass on with the action
    @private
  */
  send(actionName: string, ...args: unknown[]): void;
}
const ActionSupport = DeprecatedMixin.create(InternalActionSupport, {
  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `ActionSupport` mixin is deprecated. Invoke the corresponding method directly instead.',
      DEPRECATIONS.DEPRECATE_TARGET_ACTION_SUPPORT
    );
  },
});

export default ActionSupport;
