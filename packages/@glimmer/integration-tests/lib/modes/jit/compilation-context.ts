import {
  CompileTimeResolver,
  Option,
  AnnotatedModuleLocator,
  CompileTimeComponent,
} from '@glimmer/interfaces';
import { TestJitRegistry } from './registry';
import TestJitRuntimeResolver from './resolver';

export default class JitCompileTimeLookup implements CompileTimeResolver {
  constructor(private resolver: TestJitRuntimeResolver, private registry: TestJitRegistry) {}

  resolve<T>(handle: number): T {
    return this.resolver.resolve(handle);
  }

  lookupHelper(name: string, referrer: AnnotatedModuleLocator): Option<number> {
    return this.resolver.lookupHelper(name, referrer);
  }

  lookupModifier(name: string, referrer: AnnotatedModuleLocator): Option<number> {
    return this.resolver.lookupModifier(name, referrer);
  }

  lookupComponent(name: string, referrer: AnnotatedModuleLocator): Option<CompileTimeComponent> {
    return this.registry.lookupCompileTimeComponent(name, referrer);
  }

  lookupPartial(name: string, referrer: AnnotatedModuleLocator): Option<number> {
    return this.resolver.lookupPartial(name, referrer);
  }
}
