import { IArguments } from '../vm/arguments';
import { DOMChanges } from '../dom/helper';
import { DynamicScope } from '../environment';
import { Destroyable } from '@glimmer/util';
import { Opaque, Option, Unique } from '@glimmer/interfaces';
import { Tag } from '@glimmer/reference';

export type ModifierDefinitionState = Unique<'ModifierDefinitionState'>;
export type ModifierInstanceState = Unique<'ModifierInstanceState'>;

export interface PublicModifierDefinition<
  ModifierDefinitionState = Opaque,
  Manager = ModifierManager<Opaque, ModifierDefinitionState>
> {
  state: ModifierDefinitionState;
  manager: Manager;
}

/* @internal */
export interface ModifierDefinition {
  manager: InternalModifierManager;
  state: ModifierDefinitionState;
}

/* @internal */
export type InternalModifierManager = ModifierManager<
  ModifierInstanceState,
  ModifierDefinitionState
>;

export interface ModifierManager<ModifierInstanceState, ModifierDefinitionState> {
  // Create is meant to only produce the state bucket
  create(
    element: Element,
    state: ModifierDefinitionState,
    args: IArguments,
    dynamicScope: DynamicScope,
    dom: DOMChanges
  ): ModifierInstanceState;

  // Convert the opaque modifier into a `RevisionTag` that determins when
  // the modifier's update hooks need to be called (if at all).
  getTag(modifier: ModifierInstanceState): Tag;

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
  getDestructor(modifier: ModifierInstanceState): Option<Destroyable>;
}
