/**
@module ember
*/

import { DeprecatedMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import InternalProxyMixin from '@ember/-internals/runtime/lib/mixins/-proxy-internal';

export { contentFor } from '@ember/-internals/runtime/lib/mixins/-proxy-internal';

/**
  `ProxyMixin` forwards all properties not defined by the proxy itself
  to a proxied `content` object.  See ObjectProxy for more details.

  @class ProxyMixin
  @namespace Ember
  @private
*/
interface ProxyMixin<T = unknown> {
  /**
    The object whose properties will be forwarded.

    @property content
    @type {unknown}
    @default null
    @public
  */
  content: T | null;

  willDestroy(): void;

  isTruthy: boolean;

  unknownProperty<K extends keyof T>(key: K): T[K] | undefined;
  unknownProperty(key: string): unknown;

  setUnknownProperty<K extends keyof T>(key: K, value: T[K]): T[K];
  setUnknownProperty<V>(key: string, value: V): V;
}

const ProxyMixin = /*@__PURE__*/ DeprecatedMixin.create(InternalProxyMixin, {
  /**
    The object whose properties will be forwarded.

    @property content
    @type {unknown}
    @default null
    @public
  */

  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `ProxyMixin` mixin is deprecated. Access the underlying object directly instead.',
      DEPRECATIONS.DEPRECATE_PROXY_MIXIN
    );
  },
});

export default ProxyMixin;
