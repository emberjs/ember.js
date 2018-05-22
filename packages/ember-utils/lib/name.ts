import { isObject } from './spec';
const NAMES = new WeakMap<object, string>();

export function setName(obj: object, name: string): void {
  if (isObject(obj)) NAMES.set(obj, name);
}

export function getName(obj: object): string | undefined {
  return NAMES.get(obj);
}
