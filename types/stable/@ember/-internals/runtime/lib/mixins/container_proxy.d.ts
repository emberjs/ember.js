declare module '@ember/-internals/runtime/lib/mixins/container_proxy' {
  /**
    @module ember
    */
  import type Container from '@ember/-internals/container/lib/container';
  import Mixin from '@ember/object/mixin';
  import type { ContainerProxy } from '@ember/-internals/owner';
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
  const ContainerProxyMixin: Mixin;
  export default ContainerProxyMixin;
}
