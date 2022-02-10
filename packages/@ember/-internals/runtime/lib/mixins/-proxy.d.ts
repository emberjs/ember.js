import { Mixin } from '@ember/-internals/metal';

export function contentFor<T>(proxy: ProxyMixin<T>): T | null;

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
declare const ProxyMixin: Mixin;

export default ProxyMixin;
