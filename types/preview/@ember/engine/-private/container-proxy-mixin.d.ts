declare module '@ember/engine/-private/container-proxy-mixin' {
  import { ContainerProxy } from '@ember/-internals/owner';
  import Mixin from '@ember/object/mixin';

  /**
   * Given a fullName return a factory manager.
   */
  interface ContainerProxyMixin extends ContainerProxy {}
  const ContainerProxyMixin: Mixin;
  export default ContainerProxyMixin;
}
