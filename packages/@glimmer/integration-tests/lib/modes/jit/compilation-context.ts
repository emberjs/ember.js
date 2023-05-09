import {
  type CompileTimeResolver,
  type HelperDefinitionState,
  type ModifierDefinitionState,
  type Option,
  type ResolvedComponentDefinition,
} from '@glimmer/interfaces';

import { type TestJitRuntimeResolver } from './resolver';

export default class JitCompileTimeLookup implements CompileTimeResolver {
  constructor(private resolver: TestJitRuntimeResolver) {}

  lookupHelper(name: string): Option<HelperDefinitionState> {
    return this.resolver.lookupHelper(name);
  }

  lookupModifier(name: string): Option<ModifierDefinitionState> {
    return this.resolver.lookupModifier(name);
  }

  lookupComponent(name: string, owner?: object): Option<ResolvedComponentDefinition> {
    return this.resolver.lookupComponent(name, owner);
  }

  lookupBuiltInHelper(_name: string): Option<HelperDefinitionState> {
    return null;
  }

  lookupBuiltInModifier(_name: string): Option<ModifierDefinitionState> {
    return null;
  }
}
