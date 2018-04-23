const NAMES = new WeakMap();

export function setName(obj, name) {
  if ((obj !== null && typeof obj === 'object') || typeof obj === 'function') NAMES.set(obj, name);
}

export function getName(obj) {
  return NAMES.get(obj);
}
