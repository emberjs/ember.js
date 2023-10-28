import type { _ProxyMixin } from '@ember/-internals/runtime';
import { isObject } from '@ember/-internals/utils';
import { _WeakSet as WeakSet } from '@glimmer/util';

const PROXIES = new WeakSet();

export function isProxy(value: unknown): value is _ProxyMixin<unknown> {
  if (isObject(value)) {
    return PROXIES.has(value);
  }
  return false;
}

export function setProxy(object: _ProxyMixin<unknown>): void {
  if (isObject(object)) {
    PROXIES.add(object);
  }
}
