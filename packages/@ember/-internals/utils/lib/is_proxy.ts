import type { ContentProxy } from '@ember/-internals/runtime/lib/proxy-utils';
import { isObject } from './spec';

const PROXIES = new WeakSet();

export function isProxy(value: unknown): value is ContentProxy {
  if (isObject(value)) {
    return PROXIES.has(value);
  }
  return false;
}

export function setProxy(object: ContentProxy): void {
  if (isObject(object)) {
    PROXIES.add(object);
  }
}
