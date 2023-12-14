/**
 @module ember
*/
import { get } from '@ember/-internals/metal';
import Mixin from '@ember/object/mixin';
import { assert, inspect } from '@ember/debug';
const ActionSupport = Mixin.create({
  send(actionName, ...args) {
    assert(`Attempted to call .send() with the action '${actionName}' on the destroyed object '${this}'.`, !this.isDestroying && !this.isDestroyed);
    let action = this.actions && this.actions[actionName];
    if (action) {
      let shouldBubble = action.apply(this, args) === true;
      if (!shouldBubble) {
        return;
      }
    }
    let target = get(this, 'target');
    if (target) {
      assert(`The \`target\` for ${this} (${target}) does not have a \`send\` method`, typeof target.send === 'function');
      target.send(...arguments);
    } else {
      assert(`${inspect(this)} had no action handler for: ${actionName}`, action);
    }
  }
});
export default ActionSupport;