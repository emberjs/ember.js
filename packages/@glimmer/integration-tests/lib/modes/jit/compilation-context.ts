import { CompileTimeResolver, Option, CompileTimeComponent } from '@glimmer/interfaces';
import { TestJitRuntimeResolver } from './resolver';

export default class JitCompileTimeLookup implements CompileTimeResolver {
  constructor(private resolver: TestJitRuntimeResolver) {}

  resolve<T>(handle: number): T {
    return this.resolver.resolve(handle);
  }

  lookupHelper(name: string): Option<number> {
    return this.resolver.lookupHelper(name);
  }

  lookupModifier(name: string): Option<number> {
    return this.resolver.lookupModifier(name);
  }

  lookupComponent(name: string, owner?: object): Option<CompileTimeComponent> {
    return this.resolver.lookupCompileTimeComponent(name, owner);
  }

  lookupPartial(name: string): Option<number> {
    return this.resolver.lookupPartial(name);
  }
}
