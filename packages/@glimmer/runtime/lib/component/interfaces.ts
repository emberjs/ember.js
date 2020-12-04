import {
  ComponentDefinitionState,
  ComponentInstanceState,
  InternalComponentManager,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';

/** @internal */
export function hasCustomDebugRenderTreeLifecycle<
  D extends ComponentDefinitionState,
  I extends ComponentInstanceState
>(manager: InternalComponentManager<I, D>): manager is WithCustomDebugRenderTree<I, D> {
  return 'getDebugCustomRenderTree' in manager;
}
