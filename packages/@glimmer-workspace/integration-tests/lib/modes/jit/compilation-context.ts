import type {
  CompileTimeResolver,
  HelperDefinitionState,
  ModifierDefinitionState,
  Nullable,
  ResolvedComponentDefinition,
} from '@glimmer/interfaces';

import type { TestJitRuntimeResolver } from './resolver';

export default class JitCompileTimeLookup implements CompileTimeResolver {
  constructor(private resolver: TestJitRuntimeResolver) {}

  lookupHelper(name: string): Nullable<HelperDefinitionState> {
    return this.resolver.lookupHelper(name);
  }

  lookupModifier(name: string): Nullable<ModifierDefinitionState> {
    return this.resolver.lookupModifier(name);
  }

  lookupComponent(name: string, owner?: object): Nullable<ResolvedComponentDefinition> {
    return this.resolver.lookupComponent(name, owner);
  }

  lookupBuiltInHelper(_name: string): Nullable<HelperDefinitionState> {
    return null;
  }

  lookupBuiltInModifier(_name: string): Nullable<ModifierDefinitionState> {
    return null;
  }
}
