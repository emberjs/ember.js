declare module '@ember/-internals/utils/lib/is_proxy' {
  import type ProxyMixin from '@ember/-internals/runtime/lib/mixins/-proxy';
  export function isProxy(value: unknown): value is ProxyMixin<unknown>;
  export function setProxy(object: ProxyMixin<unknown>): void;
}
