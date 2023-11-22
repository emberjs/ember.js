import type { InternalModifierManager } from '../managers';

export type ModifierDefinitionState = object;
export type ModifierInstanceState = unknown;

export interface ModifierDefinition<
  I = unknown,
  D extends ModifierDefinitionState = ModifierDefinitionState,
> {
  resolvedName: string | null;
  manager: InternalModifierManager<I, D>;
  state: ModifierDefinitionState;
}

export interface ModifierInstance {
  definition: ModifierDefinition;
  state: ModifierInstanceState;
  manager: InternalModifierManager;
}
