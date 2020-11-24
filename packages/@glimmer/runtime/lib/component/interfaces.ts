import {
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
