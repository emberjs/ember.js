import EngineInstance from '@ember/engine/instance';
import { ComponentManager } from '@glimmer/interfaces';
import {
  componentCapabilities as glimmerComponentCapabilities,
  modifierCapabilities as glimmerModifierCapabilities,
  setComponentManager as glimmerSetComponentManager,
} from '@glimmer/manager';

export function setComponentManager(
  manager: (owner: EngineInstance) => ComponentManager<unknown>,
  obj: object
): object {
  return glimmerSetComponentManager(manager, obj);
}

export let componentCapabilities = glimmerComponentCapabilities;
export let modifierCapabilities = glimmerModifierCapabilities;
