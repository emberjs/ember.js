import {
  InternalComponentCapabilities,
  ComponentDefinitionState,
  ComponentInstanceState,
  InternalComponentManager,
  WithCustomDebugRenderTree,
  WithStaticLayout,
} from '@glimmer/interfaces';
import { hasCapability, Capability } from '../capabilities';

/** @internal */
export function hasStaticLayout<
  D extends ComponentDefinitionState,
  I extends ComponentInstanceState
>(
  capabilities: Capability,
  _manager: InternalComponentManager<I, D>
): _manager is WithStaticLayout<I, D> {
  return !hasCapability(capabilities, Capability.DynamicLayout);
}

export function hasCustomDebugRenderTreeLifecycle<
  D extends ComponentDefinitionState,
  I extends ComponentInstanceState
>(manager: InternalComponentManager<I, D>): manager is WithCustomDebugRenderTree<I, D> {
  return 'getDebugCustomRenderTree' in manager;
}

export const DEFAULT_CAPABILITIES: InternalComponentCapabilities = {
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

export const MINIMAL_CAPABILITIES: InternalComponentCapabilities = {
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
