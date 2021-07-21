/**
 @module ember
*/
import { inspect } from '@ember/-internals/utils';
import { Mixin, get } from '@ember/-internals/metal';
import { assert } from '@ember/debug';

const mixinObj = {
  send(actionName, ...args) {
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
};

/**
 @class ActionSupport
 @namespace Ember
 @private
*/
export default Mixin.create(mixinObj);
