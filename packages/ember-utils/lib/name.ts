const NAMES = new WeakMap();

export function setName(obj: object, name: string) {
  if (obj !== null || typeof obj === 'object' || typeof obj === 'function') NAMES.set(obj, name);
}

export function getName(obj: object) {
  if (obj !== null || typeof obj === 'object' || typeof obj === 'function') return NAMES.get(obj);
}
