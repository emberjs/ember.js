import { schedule, join } from '@ember/runloop';
/**
@module ember
*/
import { InternalMixin } from '@ember/object/mixin-internal';

/**
  The internal counterpart to the public `ContainerProxyMixin`. Ember's own
  internals apply this so that they do not trigger the deprecation that the
  public mixin emits. The public API documentation lives on the public copy.

  @internal
*/
const InternalContainerProxyMixin = InternalMixin.create({
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

export default InternalContainerProxyMixin;
