declare module '@ember/engine/-private/container-proxy-mixin' {
  import Owner from '@ember/owner';
  import Mixin from '@ember/object/mixin';

  /**
   * Given a fullName return a factory manager.
   */
  interface ContainerProxyMixin extends Owner {
    /**
     * Returns an object that can be used to provide an owner to a
     * manually created instance.
     */
    ownerInjection(): {};
  }
  const ContainerProxyMixin: Mixin;
  export default ContainerProxyMixin;
}
