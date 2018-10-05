import { _WeakSet as WeakSet } from '@ember/polyfills';
import { isObject } from './spec';

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
