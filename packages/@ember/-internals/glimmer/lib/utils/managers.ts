import { Owner } from '@ember/-internals/owner';
import { Option } from '@glimmer/interfaces';

const MANAGERS: WeakMap<object, ManagerWrapper<unknown>> = new WeakMap();

const getPrototypeOf = Object.getPrototypeOf;

export type ManagerFactory<ManagerDelegate> = (owner: Owner) => ManagerDelegate;

export interface ManagerWrapper<ManagerDelegate> {
  factory: ManagerFactory<ManagerDelegate>;
  internal: boolean;
  type: 'component' | 'modifier';
}

export function setManager<ManagerDelegate>(wrapper: ManagerWrapper<ManagerDelegate>, obj: object) {
  MANAGERS.set(obj, wrapper);
  return obj;
}

export function getManager<ManagerDelegate>(obj: object): Option<ManagerWrapper<ManagerDelegate>> {
  let pointer = obj;
  while (pointer !== undefined && pointer !== null) {
    let manager = MANAGERS.get(pointer);

    if (manager !== undefined) {
      return manager as ManagerWrapper<ManagerDelegate>;
    }

    pointer = getPrototypeOf(pointer);
  }

  return null;
}
