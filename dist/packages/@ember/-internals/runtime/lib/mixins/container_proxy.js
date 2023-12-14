import { schedule, join } from '@ember/runloop';
import Mixin from '@ember/object/mixin';
const ContainerProxyMixin = Mixin.create({
  /**
   The container stores state.
      @private
   @property {Ember.Container} __container__
   */
  __container__: null,
  ownerInjection() {
    return this.__container__.ownerInjection();
  },
  lookup(fullName, options) {
    return this.__container__.lookup(fullName, options);
  },
  destroy() {
    let container = this.__container__;
    if (container) {
      join(() => {
        container.destroy();
        schedule('destroy', container, 'finalizeDestroy');
      });
    }
    this._super();
  },
  factoryFor(fullName) {
    return this.__container__.factoryFor(fullName);
  }
});
export default ContainerProxyMixin;