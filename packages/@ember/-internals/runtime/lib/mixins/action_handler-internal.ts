/**
@module ember
*/

import { InternalMixin } from '@ember/object/mixin-internal';
import { get } from '@ember/-internals/metal/lib/property_get';
import { assert } from '@ember/debug';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

/**
  The internal counterpart to the public `ActionHandler` mixin. Ember's own
  internals apply this so that they do not trigger the deprecation that the
  public mixin emits. The public API documentation lives on the public copy.

  @internal
*/
interface InternalActionHandler {
  actions?: Record<string, (...args: any[]) => unknown>;
  send(actionName: string, ...args: unknown[]): void;
}
const InternalActionHandler = InternalMixin.create({
  mergedProperties: ['actions'],

  send(actionName: string, ...args: any[]) {
    deprecateUntil(
      `Calling \`.send()\` on ${this} is deprecated. Invoke the corresponding method directly.`,
      DEPRECATIONS.DEPRECATE_TARGET_ACTION_SUPPORT
    );
    assert(
      `Attempted to call .send() with the action '${actionName}' on the destroyed object '${this}'.`,
      !this.isDestroying && !this.isDestroyed
    );
    if (this.actions && this.actions[actionName]) {
      let shouldBubble = this.actions[actionName].apply(this, args) === true;
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
    }
  },
});

export default InternalActionHandler;
