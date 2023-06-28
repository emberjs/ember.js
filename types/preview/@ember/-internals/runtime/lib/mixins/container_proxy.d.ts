declare module '@ember/-internals/runtime/lib/mixins/container_proxy' {
  import { ContainerProxy } from '@ember/-internals/owner';
  import Mixin from '@ember/object/mixin';

  /**
   * Given a fullName return a factory manager.
   */
  interface ContainerProxyMixin extends ContainerProxy {}
  const ContainerProxyMixin: Mixin;
  export default ContainerProxyMixin;
}
