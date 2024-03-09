import type { SimpleElement } from '@simple-dom/interface';

import type { Destroyable } from '../../core.js';
import type { Owner } from '../../runtime.js';
import type { CapturedArguments } from '../../runtime/arguments.js';
import type { ModifierDefinitionState, ModifierInstanceState } from '../../runtime/modifier.js';
import type { UpdatableTag } from '../../tags.js';

export interface InternalModifierManager<
  TModifierInstanceState = ModifierInstanceState,
  TModifierDefinitionState extends ModifierDefinitionState = ModifierDefinitionState,
> {
  // Create is meant to only produce the state bucket
  create(
    owner: Owner,
    element: SimpleElement,
    state: TModifierDefinitionState,
    args: CapturedArguments
  ): TModifierInstanceState;

  // Convert the opaque modifier into a `RevisionTag` that determins when
  // the modifier's update hooks need to be called (if at all).
  getTag(modifier: TModifierInstanceState): UpdatableTag | null;

  getDebugName(Modifier: TModifierDefinitionState): string;
  getDebugInstance(Modifier: TModifierInstanceState): unknown;

  // At initial render, the modifier gets a chance to install itself on the
  // element it is managing. It can also return a bucket of state that
  // it could use at update time. From the perspective of Glimmer, this
  // is an opaque token.
  install(modifier: TModifierInstanceState): void;

  // When the modifier's tag has invalidated, the manager's `update` hook is
  // called.
  update(modifier: TModifierInstanceState): void;

  // Convert the opaque token into an object that implements Destroyable.
  // If it returns null, the modifier will not be destroyed.
  getDestroyable(modifier: TModifierInstanceState): Destroyable | null;
}
