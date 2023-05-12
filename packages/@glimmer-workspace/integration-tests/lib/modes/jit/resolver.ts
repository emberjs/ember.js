import type {
  HelperDefinitionState,
  ModifierDefinitionState,
  Nullable,
  ResolvedComponentDefinition,
  RuntimeResolver,
} from '@glimmer/interfaces';

import type { TestJitRegistry } from './registry';

export class TestJitRuntimeResolver implements RuntimeResolver {
  constructor(private registry: TestJitRegistry) {}

  lookupHelper(name: string): Nullable<HelperDefinitionState> {
    return this.registry.lookup('helper', name);
  }

  lookupModifier(name: string): Nullable<ModifierDefinitionState> {
    return this.registry.lookup('modifier', name);
  }

  lookupComponent(name: string, _owner?: object): Nullable<ResolvedComponentDefinition> {
    return this.registry.lookupComponent(name);
  }
}
