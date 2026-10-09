import type {
  ClassicResolver,
  HelperDefinitionState,
  ModifierDefinitionState,
  Nullable,
  ResolvedComponentDefinition,
} from '@glimmer/interfaces';
import ResolverImpl from '@ember/-internals/glimmer/lib/resolver';

import type { TestOwner } from '../owner';
import type { TestJitRegistry } from './registry';

/**
 * Components are resolved by Ember's resolver, from the registrations on the owner the template
 * was created with. Helpers and modifiers still come from the test registry.
 */
export class TestJitRuntimeResolver implements ClassicResolver {
  private components = new ResolverImpl();

  constructor(private registry: TestJitRegistry) {}

  lookupHelper(name: string): Nullable<HelperDefinitionState> {
    return this.registry.lookup('helper', name);
  }

  lookupModifier(name: string): Nullable<ModifierDefinitionState> {
    return this.registry.lookup('modifier', name);
  }

  lookupComponent(name: string, owner?: object): Nullable<ResolvedComponentDefinition> {
    return this.components.lookupComponent(name, owner as TestOwner);
  }
}
