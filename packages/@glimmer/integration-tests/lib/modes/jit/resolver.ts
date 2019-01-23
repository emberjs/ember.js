import {
  JitRuntimeResolver,
  AnnotatedModuleLocator,
  Option,
  ComponentDefinition,
  Template,
  Invocation,
} from '@glimmer/interfaces';
import { LookupType, TestJitRegistry } from './registry';
import { createTemplate } from '../../compile';

export default class TestJitRuntimeResolver implements JitRuntimeResolver {
  readonly registry = new TestJitRegistry();

  lookup(
    type: LookupType,
    name: string,
    referrer?: Option<AnnotatedModuleLocator>
  ): Option<number> {
    return this.registry.lookup(type, name, referrer);
  }

  getInvocation(_locator: AnnotatedModuleLocator): Invocation {
    throw new Error(`getInvocation is not supported in JIT mode`);
  }

  compilable(locator: AnnotatedModuleLocator): Template {
    let compile = (source: string) => {
      return createTemplate<AnnotatedModuleLocator>(source).create();
    };

    let handle = this.lookup('template-source', locator.module)!;

    return this.registry.customCompilableTemplate(handle, name, compile);
  }

  lookupHelper(name: string, referrer?: Option<AnnotatedModuleLocator>): Option<number> {
    return this.lookup('helper', name, referrer);
  }

  lookupModifier(name: string, referrer?: Option<AnnotatedModuleLocator>): Option<number> {
    return this.lookup('modifier', name, referrer);
  }

  lookupComponent(
    name: string,
    referrer: Option<AnnotatedModuleLocator>
  ): Option<ComponentDefinition> {
    let handle = this.registry.lookupComponentHandle(name, referrer);
    if (handle === null) return null;
    return this.resolve(handle) as ComponentDefinition;
  }

  lookupPartial(name: string, referrer?: Option<AnnotatedModuleLocator>): Option<number> {
    return this.lookup('partial', name, referrer);
  }

  resolve<T>(handle: number): T {
    return this.registry.resolve(handle);
  }
}
