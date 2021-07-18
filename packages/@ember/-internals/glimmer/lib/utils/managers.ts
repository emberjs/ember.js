import { Owner } from '@ember/-internals/owner';
import { deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { ComponentManager } from '@glimmer/interfaces';
import {
  componentCapabilities as glimmerComponentCapabilities,
  modifierCapabilities as glimmerModifierCapabilities,
  setComponentManager as glimmerSetComponentManager,
} from '@glimmer/manager';

export function setComponentManager(
  manager: (owner: Owner) => ComponentManager<unknown>,
  obj: object
): object {
  return glimmerSetComponentManager(manager, obj);
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
