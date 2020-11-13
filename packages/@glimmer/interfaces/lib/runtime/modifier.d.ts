import { InternalModifierManager } from '../managers';

export interface ModifierDefinition<
  ModifierInstanceState = unknown,
  ModifierDefinitionState = unknown
> {
  manager: InternalModifierManager<ModifierInstanceState, ModifierDefinitionState>;
  state: ModifierDefinitionState;
}
