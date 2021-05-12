import { Owner } from '@ember/-internals/owner';
import { deprecate } from '@ember/debug';
import { COMPONENT_MANAGER_STRING_LOOKUP } from '@ember/deprecated-features';
import { DEBUG } from '@glimmer/env';
import { ComponentManager } from '@glimmer/interfaces';
import {
  componentCapabilities as glimmerComponentCapabilities,
  modifierCapabilities as glimmerModifierCapabilities,
  setComponentManager as glimmerSetComponentManager,
} from '@glimmer/manager';

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
        url: 'https://deprecations.emberjs.com/v3.x/#toc_component-manager-string-lookup',
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

export let componentCapabilities = glimmerComponentCapabilities;
export let modifierCapabilities = glimmerModifierCapabilities;

if (DEBUG) {
  componentCapabilities = (version, options) => {
    deprecate(
      'Versions of component manager capabilities prior to 3.13 have been deprecated. You must update to the 3.13 capabilities.',
      version === '3.13',
      {
        id: 'manager-capabilities.components-3-4',
        url: 'https://deprecations.emberjs.com/v3.x#toc_manager-capabilities-components-3-4',
        until: '4.0.0',
        for: 'ember-source',
        since: {
          enabled: '3.26.0',
        },
      }
    );

    return glimmerComponentCapabilities(version, options);
  };

  modifierCapabilities = (version, options) => {
    deprecate(
      'Versions of modifier manager capabilities prior to 3.22 have been deprecated. You must update to the 3.22 capabilities.',
      version === '3.22',
      {
        id: 'manager-capabilities.modifiers-3-13',
        url: 'https://deprecations.emberjs.com/v3.x#toc_manager-capabilities-modifiers-3-13',
        until: '4.0.0',
        for: 'ember-source',
        since: {
          enabled: '3.26.0',
        },
      }
    );

    return glimmerModifierCapabilities(version, options);
  };
}
