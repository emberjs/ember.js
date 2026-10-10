/**
 @module ember
*/
import { get } from '@ember/-internals/metal/lib/property_get';
import { InternalMixin } from '@ember/object/mixin-internal';
import inspect from '@ember/debug/lib/inspect';
import { assert } from '@ember/debug';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

/**
  The internal counterpart to the public `ActionSupport` mixin. Ember's own
  internals apply this so that they do not trigger the deprecation that the
  public mixin emits. The public API documentation lives on the public copy.

  @internal
*/
const InternalActionSupport = InternalMixin.create({
  send(actionName: string, ...args: unknown[]) {
    deprecateUntil(
      `Calling \`.send()\` on ${this} is deprecated. Invoke the corresponding method directly.`,
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

export default InternalActionSupport;
