import {
  CompileTimeResolver,
  Option,
  ResolvedComponentDefinition,
  PartialDefinition,
  HelperDefinitionState,
  ModifierDefinitionState,
} from '@glimmer/interfaces';
import { TestJitRuntimeResolver } from './resolver';

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

  lookupPartial(name: string): Option<PartialDefinition> {
    return this.resolver.lookupPartial(name);
  }
}
