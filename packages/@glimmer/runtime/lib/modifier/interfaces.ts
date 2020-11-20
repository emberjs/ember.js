import { Unique, InternalModifierManager } from '@glimmer/interfaces';

export type ModifierDefinitionState = Unique<'ModifierDefinitionState'>;
export type ModifierInstanceState = Unique<'ModifierInstanceState'>;

export interface PublicModifierDefinition<
  ModifierDefinitionState = object,
  Manager = InternalModifierManager<unknown, ModifierDefinitionState>
> {
  state: ModifierDefinitionState;
  manager: Manager;
}

/* @internal */
export interface ModifierDefinition {
  manager: InternalModifierManager;
  state: ModifierDefinitionState;
}
