import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from '@ember/canary-features';

const getPrototypeOf = Object.getPrototypeOf;
const MANAGERS: WeakMap<any, string> = new WeakMap();

export function setComponentManager(managerId: string, obj: any) {
  MANAGERS.set(obj, managerId);

  return obj;
}

export function getComponentManager(obj: any): string | undefined {
  if (!GLIMMER_CUSTOM_COMPONENT_MANAGER) {
    return;
  }

  let pointer = obj;
  while (pointer !== undefined && pointer !== null) {
    if (MANAGERS.has(pointer)) {
      return MANAGERS.get(pointer);
    }

    pointer = getPrototypeOf(pointer);
  }

  return;
}
