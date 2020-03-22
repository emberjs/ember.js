import { _WeakSet as WeakSet } from '@ember/polyfills';
import { isObject } from './spec';

const PROXIES = new WeakSet();

export function isProxy(value: any | undefined | null): value is object {
  if (isObject(value)) {
    return PROXIES.has(value);
  }
  return false;
}

export function setProxy(object: object): void {
  if (isObject(object)) {
    PROXIES.add(object);
  }
}
