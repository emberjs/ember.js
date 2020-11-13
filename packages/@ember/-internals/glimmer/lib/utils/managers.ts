import { Owner } from '@ember/-internals/owner';
import { deprecate } from '@ember/debug';
import { COMPONENT_MANAGER_STRING_LOOKUP } from '@ember/deprecated-features';
import { ComponentManager } from '@glimmer/interfaces';
import { setComponentManager as glimmerSetComponentManager } from '@glimmer/runtime';

export function setComponentManager(
  stringOrFunction: string | ((owner: Owner) => ComponentManager<unknown>),
  obj: object
): object {
  let factory: (owner: Owner) => ComponentManager<unknown>;

  if (COMPONENT_MANAGER_STRING_LOOKUP && typeof stringOrFunction === 'string') {
    deprecate(
      'Passing the name of the component manager to "setupComponentManager" is deprecated. Please pass a function that produces an instance of the manager.',
      false,
      {
        id: 'deprecate-string-based-component-manager',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x/#toc_component-manager-string-lookup',
        for: 'ember-source',
        since: {
          enabled: '3.8.0',
        },
      }
    );
    factory = function (owner: Owner) {
      return owner.lookup<ComponentManager<unknown>>(`component-manager:${stringOrFunction}`)!;
    };
  } else {
    factory = stringOrFunction as (owner: Owner) => ComponentManager<unknown>;
  }

  return glimmerSetComponentManager(factory, obj);
}
