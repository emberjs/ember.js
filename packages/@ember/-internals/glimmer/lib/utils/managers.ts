import { Owner } from '@ember/-internals/owner';
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
