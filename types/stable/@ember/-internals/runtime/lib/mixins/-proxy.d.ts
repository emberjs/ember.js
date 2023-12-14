declare module '@ember/-internals/runtime/lib/mixins/-proxy' {
  /**
    @module ember
    */
  import Mixin from '@ember/object/mixin';
  export function contentFor<T>(proxy: ProxyMixin<T>): T | null;
  /**
      `Ember.ProxyMixin` forwards all properties not defined by the proxy itself
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
  const ProxyMixin: Mixin;
  export default ProxyMixin;
}
