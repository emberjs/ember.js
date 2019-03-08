import { Opaque } from '@glimmer/util';
import { getManager, ManagerFactory, setManager } from './managers';

export function setModifierManager(factory: ManagerFactory<Opaque>, obj: any) {
  return setManager(factory, obj);
}

export function getModifierManager<T>(obj: any): undefined | ManagerFactory<T> {
  return getManager(obj);
}
