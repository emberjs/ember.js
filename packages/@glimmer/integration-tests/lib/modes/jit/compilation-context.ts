import {
  CompileTimeResolver,
  Option,
  ComponentDefinition,
  PartialDefinition,
  Helper,
  ModifierDefinition,
} from '@glimmer/interfaces';
import { TestJitRuntimeResolver } from './resolver';

export default class JitCompileTimeLookup implements CompileTimeResolver {
  constructor(private resolver: TestJitRuntimeResolver) {}

  lookupHelper(name: string): Option<Helper> {
    return this.resolver.lookupHelper(name);
  }

  lookupModifier(name: string): Option<ModifierDefinition> {
    return this.resolver.lookupModifier(name);
  }

  lookupComponent(name: string, owner?: object): Option<ComponentDefinition> {
    return this.resolver.lookupComponent(name, owner);
  }

  lookupPartial(name: string): Option<PartialDefinition> {
    return this.resolver.lookupPartial(name);
  }
}
