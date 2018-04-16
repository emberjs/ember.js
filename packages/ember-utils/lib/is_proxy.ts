import { isObject } from './spec';
import WeakSet from './weak_set';

const PROXIES = new WeakSet();

export function isProxy(object: any | undefined | null) {
  return isObject(object) && PROXIES.has(object);
}

export function setProxy(object: object) {
  return PROXIES.add(object);
}
