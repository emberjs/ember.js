import {
  RuntimeResolver,
  Option,
  ComponentDefinition,
  CompileTimeComponent,
} from '@glimmer/interfaces';
import { LookupType, TestJitRegistry } from './registry';

export class TestJitRuntimeResolver implements RuntimeResolver {
  constructor(private registry: TestJitRegistry) {}

  lookup(type: LookupType, name: string): Option<number> {
    return this.registry.lookup(type, name);
  }

  lookupHelper(name: string): Option<number> {
    return this.lookup('helper', name);
  }

  lookupModifier(name: string): Option<number> {
    return this.lookup('modifier', name);
  }

  lookupComponent(name: string, _owner?: object): Option<ComponentDefinition> {
    let handle = this.registry.lookupComponentHandle(name);
    if (handle === null) return null;
    return this.resolve(handle) as ComponentDefinition;
  }

  lookupCompileTimeComponent(name: string, _owner?: object): Option<CompileTimeComponent> {
    return this.registry.lookupCompileTimeComponent(name);
  }

  lookupPartial(name: string): Option<number> {
    return this.lookup('partial', name);
  }

  resolve<T>(handle: number): T {
    return this.registry.resolve(handle);
  }
}
