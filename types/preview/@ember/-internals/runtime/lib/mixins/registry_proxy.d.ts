declare module '@ember/-internals/runtime/lib/mixins/registry_proxy' {
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
