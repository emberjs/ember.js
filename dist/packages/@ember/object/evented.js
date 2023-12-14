import { addListener, removeListener, hasListeners, sendEvent } from '@ember/-internals/metal';
import Mixin from '@ember/object/mixin';
export { on } from '@ember/-internals/metal';
const Evented = Mixin.create({
  on(name, target, method) {
    addListener(this, name, target, method);
    return this;
  },
  one(name, target, method) {
    addListener(this, name, target, method, true);
    return this;
  },
  trigger(name, ...args) {
    sendEvent(this, name, args);
  },
  off(name, target, method) {
    removeListener(this, name, target, method);
    return this;
  },
  has(name) {
    return hasListeners(this, name);
  }
});
export default Evented;