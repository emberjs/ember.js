import {
  CompileTimeResolverDelegate,
  ComponentCapabilities,
  Option,
  ComponentDefinition,
  AnnotatedModuleLocator,
  CompileTimeComponent,
} from '@glimmer/interfaces';
import { TestJitRegistry } from './registry';
import { unwrapTemplate } from '@glimmer/util';
import TestJitRuntimeResolver from './resolver';

export default class JitCompileTimeLookup implements CompileTimeResolverDelegate {
  constructor(private resolver: TestJitRuntimeResolver, private registry: TestJitRegistry) {}

  resolve<T>(handle: number): T {
    return this.resolver.resolve(handle);
  }

  private getCapabilities(handle: number): ComponentCapabilities {
    let definition = this.resolver.resolve<Option<ComponentDefinition>>(handle);
    let { manager, state } = definition!;
    return manager.getCapabilities(state);
  }

  lookupHelper(name: string, referrer: AnnotatedModuleLocator): Option<number> {
    return this.resolver.lookupHelper(name, referrer);
  }

  lookupModifier(name: string, referrer: AnnotatedModuleLocator): Option<number> {
    return this.resolver.lookupModifier(name, referrer);
  }

  lookupComponent(name: string, referrer: AnnotatedModuleLocator): Option<CompileTimeComponent> {
    let definitionHandle = this.registry.lookupComponentHandle(name, referrer);

    if (definitionHandle === null) {
      return null;
    }

    let capabilities = this.getCapabilities(definitionHandle);

    if (capabilities.dynamicLayout) {
      return {
        handle: definitionHandle,
        capabilities,
        compilable: null,
      };
    }

    let templateHandle = this.resolver.lookup('template-source', name, null);

    if (templateHandle === null) {
      throw new Error(
        `missing compile-time layout, but component ${name} didn't have the dynamicLayout capability`
      );
    }

    let source = this.resolve<string>(templateHandle);

    if (source === null || typeof source !== 'string') {
      throw new Error('UH OH');
    }

    let template = unwrapTemplate(this.registry.templateFromSource(source, name));
    let compilable = capabilities.wrapped ? template.asWrappedLayout() : template.asLayout();

    return {
      handle: definitionHandle,
      capabilities,
      compilable,
    };
  }

  lookupPartial(name: string, referrer: AnnotatedModuleLocator): Option<number> {
    return this.resolver.lookupPartial(name, referrer);
  }
}
