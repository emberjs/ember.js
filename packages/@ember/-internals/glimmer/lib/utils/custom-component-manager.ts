import { Owner } from '@ember/-internals/owner';
import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from '@ember/canary-features';
import { deprecate } from '@ember/debug';
import { COMPONENT_MANAGER_STRING_LOOKUP } from '@ember/deprecated-features';
import { Opaque } from '@glimmer/interfaces';
import { getManager, ManagerFactory, setManager } from './managers';

export function setComponentManager(stringOrFunction: string | ManagerFactory<Opaque>, obj: any) {
  let factory: ManagerFactory<Opaque>;
  if (COMPONENT_MANAGER_STRING_LOOKUP && typeof stringOrFunction === 'string') {
    deprecate(
      'Passing the name of the component manager to "setupComponentManager" is deprecated. Please pass a function that produces an instance of the manager.',
      false,
      {
        id: 'deprecate-string-based-component-manager',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x/#toc_component-manager-string-lookup',
      }
    );
    factory = function(owner: Owner) {
      return owner.lookup(`component-manager:${stringOrFunction}`);
    };
  } else {
    factory = stringOrFunction as ManagerFactory<Opaque>;
  }

  return setManager(factory, obj);
}

export function getComponentManager<T>(obj: any): undefined | ManagerFactory<T> {
  if (!GLIMMER_CUSTOM_COMPONENT_MANAGER) {
    return;
  }

  return getManager(obj);
}
