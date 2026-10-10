/**
@module ember
*/
import type Container from '@ember/-internals/container/lib/container';
import { DeprecatedMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import type { ContainerProxy } from '@ember/-internals/owner';
import InternalContainerProxyMixin from '@ember/-internals/runtime/lib/mixins/container_proxy-internal';

// This is defined as a separate interface so that it can be used in the definition of
// `Owner` without also including the `__container__` property.

/**
  ContainerProxyMixin is used to provide public access to specific
  container functionality.

  @class ContainerProxyMixin
  @extends ContainerProxy
  @private
  @deprecated Use the owner API from `@ember/owner` instead.
*/
interface ContainerProxyMixin extends ContainerProxy {
  /** @internal */
  __container__: Container;
}
const ContainerProxyMixin = DeprecatedMixin.create(InternalContainerProxyMixin, {
  /**
   The container stores state.

   @private
   @property {Ember.Container} __container__
   */

  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `ContainerProxyMixin` mixin is deprecated. Use the owner API from `@ember/owner` instead.',
      DEPRECATIONS.DEPRECATE_CONTAINER_PROXY_MIXIN
    );
  },
});

export default ContainerProxyMixin;
