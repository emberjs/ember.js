import {
  RuntimeResolver,
  Option,
  ComponentDefinition,
  Helper,
  ModifierDefinition,
  PartialDefinition,
} from '@glimmer/interfaces';
import { TestJitRegistry } from './registry';

export class TestJitRuntimeResolver implements RuntimeResolver {
  constructor(private registry: TestJitRegistry) {}

  lookupHelper(name: string): Option<Helper> {
    return this.registry.lookup('helper', name);
  }

  lookupModifier(name: string): Option<ModifierDefinition> {
    return this.registry.lookup('modifier', name);
  }

  lookupComponent(name: string, _owner?: object): Option<ComponentDefinition> {
    return this.registry.lookupComponent(name);
  }

  lookupPartial(name: string): Option<PartialDefinition> {
    return this.registry.lookup('partial', name);
  }
}
