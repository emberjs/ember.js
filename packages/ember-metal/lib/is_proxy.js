const PROXIES = new WeakMap();

export function isProxy(object) {
  return PROXIES.has(object);
}

export function setProxy(object) {
  return PROXIES.set(object, true);
}
