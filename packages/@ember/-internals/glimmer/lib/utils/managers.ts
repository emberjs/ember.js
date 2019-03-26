import { Owner } from '@ember/-internals/owner';
import { Opaque, Option } from '@glimmer/interfaces';

const MANAGERS: WeakMap<any, ManagerWrapper<Opaque>> = new WeakMap();

const getPrototypeOf = Object.getPrototypeOf;

export type ManagerFactory<ManagerDelegate> = (owner: Owner) => ManagerDelegate;

export interface ManagerWrapper<ManagerDelegate> {
  factory: ManagerFactory<ManagerDelegate>;
  internal: boolean;
  type: 'component' | 'modifier';
}

export function setManager<ManagerDelegate>(wrapper: ManagerWrapper<ManagerDelegate>, obj: any) {
  MANAGERS.set(obj, wrapper);
  return obj;
}

export function getManager<ManagerDelegate>(obj: any): Option<ManagerWrapper<ManagerDelegate>> {
  let pointer = obj;
  while (pointer !== undefined && pointer !== null) {
    if (MANAGERS.has(pointer)) {
      return MANAGERS.get(pointer) as ManagerWrapper<ManagerDelegate>;
    }

    pointer = getPrototypeOf(pointer);
  }

  return null;
}
