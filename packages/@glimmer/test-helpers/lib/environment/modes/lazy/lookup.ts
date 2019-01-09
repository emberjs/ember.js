import {
  AnnotatedModuleLocator,
  CompilableProgram,
  CompileTimeResolverDelegate,
  ComponentCapabilities,
  ComponentDefinition,
  Option,
  TemplateMeta,
  WithJitStaticLayout,
} from '@glimmer/interfaces';
import { assert } from '@glimmer/util';
import RuntimeResolver from './runtime-resolver';

export default class LazyCompileTimeLookup implements CompileTimeResolverDelegate {
  constructor(private resolver: RuntimeResolver) {}

  private getComponentDefinition(handle: number): ComponentDefinition {
    let definition = this.resolver.resolve<Option<ComponentDefinition>>(handle);

    assert(!!definition, `Couldn't find a template for handle ${definition}`);

    return definition!;
  }

  resolve<T>(handle: number): T {
    return this.resolver.resolve(handle);
  }

  getCapabilities(handle: number): ComponentCapabilities {
    let definition = this.resolver.resolve<Option<ComponentDefinition>>(handle);
    let { manager, state } = definition!;
    return manager.getCapabilities(state);
  }

  getLayout(handle: number): Option<CompilableProgram> {
    let { manager, state } = this.getComponentDefinition(handle);
    let capabilities = manager.getCapabilities(state);

    if (capabilities.dynamicLayout === true) {
      return null;
    }

    return (manager as WithJitStaticLayout<any, any, RuntimeResolver>).getJitStaticLayout(
      state,
      this.resolver
    );
  }

  lookupHelper(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number> {
    return this.resolver.lookupHelper(name, referrer);
  }

  lookupModifier(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number> {
    return this.resolver.lookupModifier(name, referrer);
  }

  lookupComponentDefinition(
    name: string,
    referrer: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<number> {
    return this.resolver.lookupComponentHandle(name, referrer);
  }

  lookupPartial(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number> {
    return this.resolver.lookupPartial(name, referrer);
  }
}
