import { scheduleDestroyed } from '@glimmer/global-context';
import { _drainScheduledDestroys } from '@ember/-internals/glimmer/lib/environment';
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
      container.destroy();
      scheduleDestroyed(() => container.finalizeDestroy());

      // Classic wrapped the two calls above in `join`, which outside a
      // run loop flushed every queue before returning -- embedders
      // (SSR/prerender workers, FastBoot) rely on instance.destroy()
      // having torn down its rendered DOM by the time it returns, and
      // then reuse or reset the document. The drain no-ops when called
      // mid-render or mid-drain; the tick/microtask drain covers those.
      _drainScheduledDestroys();
    }

    this._super();
  },

  factoryFor(fullName: string) {
    return this.__container__.factoryFor(fullName);
  },
});

export default ContainerProxyMixin;
