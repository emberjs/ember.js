declare module '@ember/engine/-private/registry-proxy-mixin' {
  import { RegistryProxy } from '@ember/-internals/owner';
  import Mixin from '@ember/object/mixin';

  /**
   * RegistryProxyMixin is used to provide public access to specific
   * registry functionality.
   */
  interface RegistryProxyMixin extends RegistryProxy {}
  const RegistryProxyMixin: Mixin;
  export default RegistryProxyMixin;
}
