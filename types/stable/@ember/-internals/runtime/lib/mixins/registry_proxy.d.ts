declare module '@ember/-internals/runtime/lib/mixins/registry_proxy' {
  /**
    @module ember
    */
  import type { Registry } from '@ember/-internals/container';
  import type { RegistryProxy } from '@ember/-internals/owner';
  import Mixin from '@ember/object/mixin';
  /**
      RegistryProxyMixin is used to provide public access to specific
      registry functionality.

      @class RegistryProxyMixin
      @extends RegistryProxy
      @private
    */
  interface RegistryProxyMixin extends RegistryProxy {
    /** @internal */
    __registry__: Registry;
  }
  const RegistryProxyMixin: Mixin;
  export default RegistryProxyMixin;
}
