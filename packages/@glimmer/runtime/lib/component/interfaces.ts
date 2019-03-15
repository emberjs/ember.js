import {
  ComponentCapabilities,
  ComponentDefinitionState,
  ComponentInstanceState,
  ComponentManager,
  WithAotDynamicLayout,
  WithAotStaticLayout,
  WithJitDynamicLayout,
  WithJitStaticLayout,
  JitRuntimeResolver,
  RuntimeResolver,
} from '@glimmer/interfaces';

/** @internal */
export function hasStaticLayout<
  D extends ComponentDefinitionState,
  I extends ComponentInstanceState
>(
  state: D,
  manager: ComponentManager<I, D>
): manager is
  | WithAotStaticLayout<I, D, RuntimeResolver>
  | WithJitStaticLayout<I, D, JitRuntimeResolver> {
  return manager.getCapabilities(state).dynamicLayout === false;
}

/** @internal */
export function hasDynamicLayout<
  D extends ComponentDefinitionState,
  I extends ComponentInstanceState
>(
  state: D,
  manager: ComponentManager<I, D>
): manager is WithAotDynamicLayout<I, RuntimeResolver> | WithJitDynamicLayout<I, RuntimeResolver> {
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
  wrapped: false,
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
};
