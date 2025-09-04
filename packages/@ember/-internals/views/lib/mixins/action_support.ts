/**
 @module ember
*/
import { get } from '@ember/-internals/metal/lib/property_get';
import Mixin from '@ember/object/mixin';
import inspect from '@ember/debug/lib/inspect';
import { assert } from '@ember/debug';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

/**
 @class ActionSupport
 @namespace Ember
 @private
*/
interface ActionSupport {
  send(actionName: string, ...args: unknown[]): void;
}
const ActionSupport = Mixin.create({
  send(actionName: string, ...args: unknown[]) {
    deprecateUntil(
      `Calling \`.send()\` on ${this} is deprecated. Invoke the corresponding method directly instead.`,
      DEPRECATIONS.DEPRECATE_TARGET_ACTION_SUPPORT
    );

    assert(
      `Attempted to call .send() with the action '${actionName}' on the destroyed object '${this}'.`,
      !this.isDestroying && !this.isDestroyed
    );

    let action = this.actions && this.actions[actionName];

    if (action) {
      let shouldBubble = action.apply(this, args) === true;
      if (!shouldBubble) {
        return;
      }
    }

    let target = get(this, 'target');
    if (target) {
      assert(
        `The \`target\` for ${this} (${target}) does not have a \`send\` method`,
        typeof target.send === 'function'
      );
      target.send(...arguments);
    } else {
      assert(`${inspect(this)} had no action handler for: ${actionName}`, action);
    }
  },
});

export default ActionSupport;
