import {
  ComponentCapabilities,
  ComponentDefinitionState,
  ComponentInstanceState,
  ComponentManager,
  WithStaticLayout,
  RuntimeResolver,
} from '@glimmer/interfaces';
import { hasCapability, Capability } from '../capabilities';

/** @internal */
export function hasStaticLayout<
  D extends ComponentDefinitionState,
  I extends ComponentInstanceState
>(
  capabilities: Capability,
  _manager: ComponentManager<I, D>
): _manager is WithStaticLayout<I, D, RuntimeResolver> {
  return !hasCapability(capabilities, Capability.DynamicLayout);
}

export const DEFAULT_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  dynamicScope: true,
  createCaller: false,
  updateHook: true,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
};

export const MINIMAL_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  dynamicScope: false,
  createCaller: false,
  updateHook: false,
  createInstance: false,
  wrapped: false,
  willDestroy: false,
};
