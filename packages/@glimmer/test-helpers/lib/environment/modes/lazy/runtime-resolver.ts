import {
  AnnotatedModuleLocator,
  CompilableProgram,
  ComponentDefinition,
  Invocation,
  RuntimeResolver,
  TemplateMeta,
} from '@glimmer/interfaces';
import { Option } from '@glimmer/util';
import Registry, { Lookup, LookupType, TypedRegistry } from '../../registry';

export default class LazyRuntimeResolver implements RuntimeResolver {
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

  compilableProgram(
    sourceHandle: number,
    templateName: string,
    create: (source: string) => CompilableProgram
  ) {
    let compilableHandle = this.lookup('compilable', templateName);

    if (compilableHandle) {
      return this.resolve<CompilableProgram>(compilableHandle);
    }

    let source = this.resolve<string>(sourceHandle);

    let compilable = create(source);
    this.register('compilable', templateName, compilable);
    return compilable;
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

  lookupComponentDefinition(
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

  resolve<T>(handle: number): T {
    let registry = this.handleLookup[handle];
    return registry.getByHandle(handle) as T;
  }
}
