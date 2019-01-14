import {
  AnnotatedModuleLocator,
  ComponentDefinition,
  Invocation,
  TemplateMeta,
  CompileTimeComponent,
  ComponentCapabilities,
  Template,
  JitRuntimeResolver,
} from '@glimmer/interfaces';
import { Option } from '@glimmer/util';
import Registry, { Lookup, LookupType, TypedRegistry } from '../../registry';
import { createTemplate } from '../../shared';

export default class LazyRuntimeResolver implements JitRuntimeResolver {
  private handleLookup: TypedRegistry<unknown>[] = [];
  private registry = new Registry();

  register<K extends LookupType>(type: K, name: string, value: Lookup[K]): number {
    let registry = this.registry[type];
    let handle = this.handleLookup.length;
    this.handleLookup.push(registry);
    (this.registry[type] as TypedRegistry<any>).register(handle, name, value);
    return handle;
  }

  lookup(
    type: LookupType,
    name: string,
    _referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<number> {
    if (this.registry[type].hasName(name)) {
      return this.registry[type].getHandle(name);
    } else {
      return null;
    }
  }

  getInvocation(_locator: TemplateMeta<AnnotatedModuleLocator>): Invocation {
    throw new Error(`getInvocation is not supported in JIT mode`);
  }

  compilable(locator: TemplateMeta<AnnotatedModuleLocator>): Template {
    let compile = (source: string) => {
      return createTemplate<AnnotatedModuleLocator>(source).create();
    };

    let handle = this.lookup('template-source', locator.module)!;

    return this.customCompilableTemplate(handle, name, compile);
  }

  customCompilableTemplate(
    sourceHandle: number,
    templateName: string,
    create: (source: string) => Template
  ): Template {
    let compilableHandle = this.lookup('compilable', templateName);

    if (compilableHandle) {
      return this.resolve<Template>(compilableHandle);
    }

    let source = this.resolve<string>(sourceHandle);

    let compilable = create(source);
    this.register('compilable', templateName, compilable);
    return compilable;
  }

  templateFromSource(
    source: string,
    templateName: string,
    create: (source: string) => Template
  ): Template {
    let compilableHandle = this.lookup('compilable', templateName);

    if (compilableHandle) {
      return this.resolve<Template>(compilableHandle);
    }

    let template = create(source);
    this.register('compilable', templateName, template);
    return template;
  }

  compileTemplate(
    sourceHandle: number,
    templateName: string,
    create: (source: string) => Invocation
  ): Invocation {
    let invocationHandle = this.lookup('template', templateName);

    if (invocationHandle) {
      return this.resolve<Invocation>(invocationHandle);
    }

    let source = this.resolve<string>(sourceHandle);

    let invocation = create(source);
    this.register('template', templateName, invocation);
    return invocation;
  }

  lookupHelper(
    name: string,
    referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<number> {
    return this.lookup('helper', name, referrer);
  }

  lookupModifier(
    name: string,
    referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<number> {
    return this.lookup('modifier', name, referrer);
  }

  lookupComponent(
    name: string,
    referrer: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<ComponentDefinition> {
    let handle = this.lookupComponentHandle(name, referrer);
    if (handle === null) return null;
    return this.resolve(handle) as ComponentDefinition;
  }

  lookupComponentHandle(
    name: string,
    referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<number> {
    return this.lookup('component', name, referrer);
  }

  lookupPartial(
    name: string,
    referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<number> {
    return this.lookup('partial', name, referrer);
  }

  private getCapabilities(handle: number): ComponentCapabilities {
    let definition = this.resolve<Option<ComponentDefinition>>(handle);
    let { manager, state } = definition!;
    return manager.getCapabilities(state);
  }

  lookupCompileTimeComponent(
    name: string,
    referrer: Option<TemplateMeta<AnnotatedModuleLocator>>
  ): Option<CompileTimeComponent> {
    let definitionHandle = this.lookupComponentHandle(name, referrer);

    if (definitionHandle === null) {
      return null;
    }

    let templateHandle = this.lookup('template-source', name, null);

    if (templateHandle === null) {
      throw new Error('BUG: missing dynamic layout');
    }

    // TODO: This whole thing probably should have a more first-class
    // structure.
    let template = this.customCompilableTemplate(templateHandle, name, source => {
      let factory = createTemplate<AnnotatedModuleLocator>(source);
      return factory.create();
    });

    return {
      handle: definitionHandle,
      capabilities: this.getCapabilities(definitionHandle),
      compilable: template.asWrappedLayout(),
    };

    // let handle = this.resolver.lookupComponentHandle(name, referrer);

    // if (handle === null) {
    //   return null;
    // }

    // return {
    //   handle,
    //   capabilities: this.getCapabilities(handle),
    //   compilable: this.getLayout(handle),
    // };
  }

  resolve<T>(handle: number): T {
    let registry = this.handleLookup[handle];
    return registry.getByHandle(handle) as T;
  }
}
