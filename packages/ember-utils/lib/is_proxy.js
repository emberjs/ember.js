import WeakSet from './weak_set';

const PROXIES = new WeakSet();

export function isProxy(object) {
  return PROXIES.has(object);
}

export function setProxy(object) {
  return PROXIES.add(object);
}
