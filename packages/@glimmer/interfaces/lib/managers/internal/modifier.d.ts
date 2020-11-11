import { GlimmerTreeChanges } from '../../dom/changes';
// eslint-disable-next-line node/no-extraneous-import
import { UpdatableTag } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import { DynamicScope, VMArguments } from '../../runtime';
import { Destroyable } from '../../core';

export interface InternalModifierManager<
  ModifierInstanceState = unknown,
  ModifierDefinitionState = unknown
> {
  // Create is meant to only produce the state bucket
  create(
    element: SimpleElement,
    state: ModifierDefinitionState,
    args: VMArguments,
    dynamicScope: DynamicScope,
    dom: GlimmerTreeChanges
  ): ModifierInstanceState;

  // Convert the opaque modifier into a `RevisionTag` that determins when
  // the modifier's update hooks need to be called (if at all).
  getTag(modifier: ModifierInstanceState): UpdatableTag | null;

  getDebugName(Modifier: ModifierInstanceState): string;

  // At initial render, the modifier gets a chance to install itself on the
  // element it is managing. It can also return a bucket of state that
  // it could use at update time. From the perspective of Glimmer, this
  // is an opaque token.
  install(modifier: ModifierInstanceState): void;

  // When the modifier's tag has invalidated, the manager's `update` hook is
  // called.
  update(modifier: ModifierInstanceState): void;

  // Convert the opaque token into an object that implements Destroyable.
  // If it returns null, the modifier will not be destroyed.
  getDestroyable(modifier: ModifierInstanceState): Destroyable | null;
}
