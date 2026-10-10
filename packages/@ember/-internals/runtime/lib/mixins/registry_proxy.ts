/**
@module ember
*/

import type Registry from '@ember/-internals/container/lib/registry';
import type { RegistryProxy } from '@ember/-internals/owner';

import { DeprecatedMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import InternalRegistryProxyMixin from '@ember/-internals/runtime/lib/mixins/registry_proxy-internal';

/**
  RegistryProxyMixin is used to provide public access to specific
  registry functionality.

  @class RegistryProxyMixin
  @extends RegistryProxy
  @private
  @deprecated Use the owner API from `@ember/owner` instead.
*/
interface RegistryProxyMixin extends RegistryProxy {
  /** @internal */
  __registry__: Registry;
}
const RegistryProxyMixin = DeprecatedMixin.create(InternalRegistryProxyMixin, {
  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `RegistryProxyMixin` mixin is deprecated. Use the owner API from `@ember/owner` instead.',
      DEPRECATIONS.DEPRECATE_REGISTRY_PROXY_MIXIN
    );
  },
});

export default RegistryProxyMixin;
