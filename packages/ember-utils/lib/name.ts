import { isObject } from './spec';
const NAMES = new WeakMap();

export function setName(obj: object, name: string) {
  if (isObject(obj)) NAMES.set(obj, name);
}

export function getName(obj: object) {
  return NAMES.get(obj);
}
