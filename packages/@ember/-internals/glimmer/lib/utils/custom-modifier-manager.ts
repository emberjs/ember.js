import { Owner } from '@ember/-internals/owner';
import { GLIMMER_MODIFIER_MANAGER } from '@ember/canary-features';
import { Opaque } from '@glimmer/util';
import { ModifierManagerDelegate } from '../modifiers/custom';

const getPrototypeOf = Object.getPrototypeOf;

export type ModifierManagerFactory = (owner: Owner) => ModifierManagerDelegate<Opaque>;

const MANAGERS: WeakMap<any, ModifierManagerFactory> = new WeakMap();

export function setModifierManager(factory: ModifierManagerFactory, obj: any) {
  MANAGERS.set(obj, factory);
  return obj;
}

export function getModifierManager(obj: any): undefined | ModifierManagerFactory {
  if (!GLIMMER_MODIFIER_MANAGER) {
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
