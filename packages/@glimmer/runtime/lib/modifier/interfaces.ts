import { Unique, ModifierManager } from '@glimmer/interfaces';

export type ModifierDefinitionState = Unique<'ModifierDefinitionState'>;
export type ModifierInstanceState = Unique<'ModifierInstanceState'>;

export interface PublicModifierDefinition<
  ModifierDefinitionState = unknown,
  Manager = ModifierManager<unknown, ModifierDefinitionState>
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
