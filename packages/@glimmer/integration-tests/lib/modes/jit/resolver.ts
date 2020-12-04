import {
  RuntimeResolver,
  Option,
  ResolvedComponentDefinition,
  PartialDefinition,
  ModifierDefinitionState,
  HelperDefinitionState,
} from '@glimmer/interfaces';
import { TestJitRegistry } from './registry';

export class TestJitRuntimeResolver implements RuntimeResolver {
  constructor(private registry: TestJitRegistry) {}

  lookupHelper(name: string): Option<HelperDefinitionState> {
    return this.registry.lookup('helper', name);
  }

  lookupModifier(name: string): Option<ModifierDefinitionState> {
    return this.registry.lookup('modifier', name);
  }

  lookupComponent(name: string, _owner?: object): Option<ResolvedComponentDefinition> {
    return this.registry.lookupComponent(name);
  }

  lookupPartial(name: string): Option<PartialDefinition> {
    return this.registry.lookup('partial', name);
  }
}
