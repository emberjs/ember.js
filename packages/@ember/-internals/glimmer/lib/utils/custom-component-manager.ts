import { Owner } from '@ember/-internals/owner';
import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from '@ember/canary-features';
import { Opaque } from '@glimmer/interfaces';
import { getManager, ManagerFactory, setManager } from './managers';

export function setComponentManager(stringOrFunction: string | ManagerFactory<Opaque>, obj: any) {
  let factory;
  if (typeof stringOrFunction === 'string') {
    factory = function(owner: Owner) {
      return owner.lookup(`component-manager:${stringOrFunction}`);
    };
  } else {
    factory = stringOrFunction;
  }
  return setManager(factory, obj);
}

export function getComponentManager<T>(obj: any): undefined | ManagerFactory<T> {
  if (!GLIMMER_CUSTOM_COMPONENT_MANAGER) {
    return;
  }

  return getManager(obj);
}
