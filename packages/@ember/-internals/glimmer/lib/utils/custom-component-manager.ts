import { Owner } from '@ember/-internals/owner';
import { deprecate } from '@ember/debug';
import { COMPONENT_MANAGER_STRING_LOOKUP } from '@ember/deprecated-features';
import { ManagerDelegate } from '../component-managers/custom';
import { getManager, ManagerFactory, setManager } from './managers';

export function setComponentManager(
  stringOrFunction: string | ManagerFactory<ManagerDelegate<unknown>>,
  obj: any
) {
  let factory: ManagerFactory<unknown>;
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
    factory = stringOrFunction as ManagerFactory<unknown>;
  }

  return setManager({ factory, internal: false, type: 'component' }, obj);
}

export function getComponentManager<T>(obj: any): undefined | ManagerFactory<ManagerDelegate<T>> {
  let wrapper = getManager<ManagerDelegate<T>>(obj);

  if (wrapper && !wrapper.internal && wrapper.type === 'component') {
    return wrapper.factory;
  } else {
    return undefined;
  }
}
