import { Owner } from '@ember/-internals/owner';
import { Dict, Opaque } from '@glimmer/interfaces';
import { CapturedArguments } from '@glimmer/runtime';

const MANAGERS: WeakMap<any, ManagerFactory<Opaque>> = new WeakMap();

const getPrototypeOf = Object.getPrototypeOf;

export type ManagerFactory<ManagerDelegate> = (owner: Owner) => ManagerDelegate;

export function setManager<ManagerDelegate>(factory: ManagerFactory<ManagerDelegate>, obj: any) {
  MANAGERS.set(obj, factory);
  return obj;
}

export function getManager<T>(obj: any): undefined | ManagerFactory<T> {
  let pointer = obj;
  while (pointer !== undefined && pointer !== null) {
    if (MANAGERS.has(pointer)) {
      return MANAGERS.get(pointer) as ManagerFactory<T>;
    }

    pointer = getPrototypeOf(pointer);
  }

  return;
}

export function valueForCapturedArgs(args: CapturedArguments): ManagerArgs {
  return {
    named: args.named.value(),
    positional: args.positional.value(),
  };
}

export interface ManagerArgs {
  named: Dict<Opaque>;
  positional: Opaque[];
}
