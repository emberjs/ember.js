import {
  AnnotatedModuleLocator,
  CompileTimeResolverDelegate,
  ComponentCapabilities,
  ComponentDefinition,
  Option,
  TemplateMeta,
  CompileTimeComponent,
  Template,
} from '@glimmer/interfaces';
import LazyRuntimeResolver, { JitRegistry } from './runtime-resolver';
import { createTemplate } from '../../shared';

export default class LazyCompileTimeLookup implements CompileTimeResolverDelegate {
  constructor(private resolver: LazyRuntimeResolver, private registry: JitRegistry) {}

  resolve<T>(handle: number): T {
    return this.resolver.resolve(handle);
  }

  private getCapabilities(handle: number): ComponentCapabilities {
    let definition = this.resolver.resolve<Option<ComponentDefinition>>(handle);
    let { manager, state } = definition!;
    return manager.getCapabilities(state);
  }

  lookupHelper(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number> {
    return this.resolver.lookupHelper(name, referrer);
  }

  lookupModifier(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number> {
    return this.resolver.lookupModifier(name, referrer);
  }

  // name is a cache key
  compile(source: string, name: string): Template {
    // throw new Error('NOPE');
    // TODO: This whole thing probably should have a more first-class
    // structure.
    return this.registry.templateFromSource(source, name, source => {
      let factory = createTemplate<AnnotatedModuleLocator>(source);
      return factory.create();
    });
  }

  lookupComponent(
    name: string,
    referrer: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<CompileTimeComponent> {
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

    let template = this.compile(source, name);
    let compilable = capabilities.wrapped ? template.asWrappedLayout() : template.asLayout();

    return {
      handle: definitionHandle,
      capabilities,
      compilable,
    };
  }

  lookupPartial(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number> {
    return this.resolver.lookupPartial(name, referrer);
  }
}
