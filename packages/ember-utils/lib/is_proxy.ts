import { isObject } from './spec';
import WeakSet from './weak_set';

const PROXIES = new WeakSet();

export function isProxy(object: any | undefined | null) {
  return PROXIES.has(object);
}

export function setProxy(object: object) {
  if (isObject(object)) {
    PROXIES.add(object);
  }
}
