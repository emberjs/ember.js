import { schedule, join } from '@ember/runloop';
/**
@module ember
*/
import type Container from '@ember/-internals/container/lib/container';
import Mixin from '@ember/object/mixin';
import type { ContainerProxy } from '@ember/-internals/owner';

// This is defined as a separate interface so that it can be used in the definition of
// `Owner` without also including the `__container__` property.

/**
  ContainerProxyMixin is used to provide public access to specific
  container functionality.

  @class ContainerProxyMixin
  @extends ContainerProxy
  @private
*/
interface ContainerProxyMixin extends ContainerProxy {
  /** @internal */
  __container__: Container;
}
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

  lookup(fullName: string, options: object) {
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

  factoryFor(fullName: string) {
    return this.__container__.factoryFor(fullName);
  },
});

export default ContainerProxyMixin;
