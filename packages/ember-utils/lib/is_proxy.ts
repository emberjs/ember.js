import { isObject } from './spec';
import WeakSet from './weak_set';

const PROXIES = new WeakSet();

export function isProxy(object: any | undefined | null) {
  if (isObject(object)) {
    return PROXIES.has(object);
  }
  return false;
}

export function setProxy(object: object) {
  if (isObject(object)) {
    PROXIES.add(object);
  }
}
