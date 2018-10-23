import { GLIMMER_MODIFIER_MANAGER } from '@ember/canary-features';
import { Opaque } from '@glimmer/util';
import { getManager, ManagerFactory, setManager } from './managers';

export function setModifierManager(factory: ManagerFactory<Opaque>, obj: any) {
  return setManager(factory, obj);
}

export function getModifierManager<T>(obj: any): undefined | ManagerFactory<T> {
  if (!GLIMMER_MODIFIER_MANAGER) {
    return;
  }

  return getManager(obj);
}
