import {
  ComponentCapabilities,
  ComponentDefinitionState,
  ComponentInstanceState,
  ComponentManager,
  RuntimeResolverDelegate,
  WithAotDynamicLayout,
  WithAotStaticLayout,
  WithJitDynamicLayout,
  WithJitStaticLayout,
} from '@glimmer/interfaces';

/** @internal */
export function hasStaticLayout<
  D extends ComponentDefinitionState,
  I extends ComponentInstanceState
>(
  state: D,
  manager: ComponentManager<I, D>
): manager is
  | WithAotStaticLayout<I, D, RuntimeResolverDelegate>
  | WithJitStaticLayout<I, D, RuntimeResolverDelegate> {
  return manager.getCapabilities(state).dynamicLayout === false;
}

/** @internal */
export function hasDynamicLayout<
  D extends ComponentDefinitionState,
  I extends ComponentInstanceState
>(
  state: D,
  manager: ComponentManager<I, D>
): manager is
  | WithAotDynamicLayout<I, RuntimeResolverDelegate>
  | WithJitDynamicLayout<I, RuntimeResolverDelegate> {
  return manager.getCapabilities(state).dynamicLayout === true;
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
};
