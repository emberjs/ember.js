import type { _ProxyMixin as ProxyMixin } from '@ember/-internals/runtime';
import { isObject } from './spec';

const PROXIES = new WeakSet();

export function isProxy(value: unknown): value is ProxyMixin<unknown> {
  if (isObject(value)) {
    return PROXIES.has(value);
  }
  return false;
}

export function setProxy(object: ProxyMixin<unknown>): void {
  if (isObject(object)) {
    PROXIES.add(object);
  }
}
