import { RuntimeResolver, ComponentDefinition } from '@glimmer/interfaces';
import { TemplateOptions } from '@glimmer/opcode-compiler';
import { Option, Opaque } from '@glimmer/util';
import { Invocation } from '@glimmer/runtime';

import Registry, { TypedRegistry, Lookup, LookupType } from '../../registry';
import { TemplateLocator } from '@glimmer/bundle-compiler';

export default class LazyRuntimeResolver implements RuntimeResolver<TemplateLocator> {
  private handleLookup: TypedRegistry<Opaque>[] = [];
  private registry = new Registry();

  private options: TemplateOptions<TemplateLocator>;

  register<K extends LookupType>(type: K, name: string, value: Lookup[K]): number {
    let registry = this.registry[type];
    let handle = this.handleLookup.length;
    this.handleLookup.push(registry);
    (this.registry[type] as TypedRegistry<any>).register(handle, name, value);
    return handle;
  }

  lookup(type: LookupType, name: string, _referrer?: TemplateLocator): Option<number> {
    if (this.registry[type].hasName(name)) {
      return this.registry[type].getHandle(name);
    } else {
      return null;
    }
  }

  compileTemplate(sourceHandle: number, templateName: string, create: (source: string, options: TemplateOptions<TemplateLocator>) => Invocation): Invocation {
    let invocationHandle = this.lookup('template', templateName);

    if (invocationHandle) {
      return this.resolve<Invocation>(invocationHandle);
    }

    let source = this.resolve<string>(sourceHandle);

    let invocation = create(source, this.options);
    this.register('template', templateName, invocation);
    return invocation;
  }

  lookupHelper(name: string, referrer?: TemplateLocator): Option<number> {
    return this.lookup('helper', name, referrer);
  }

  lookupModifier(name: string, referrer?: TemplateLocator): Option<number> {
    return this.lookup('modifier', name, referrer);
  }

  lookupComponent(name: string, referrer?: TemplateLocator): Option<ComponentDefinition> {
    let handle = this.lookupComponentHandle(name, referrer);
    if (handle === null) return null;
    return this.resolve(handle) as ComponentDefinition;
  }

  lookupComponentHandle(name: string, referrer?: TemplateLocator): Option<number> {
    return this.lookup('component', name, referrer);
  }

  lookupPartial(name: string, referrer?: TemplateLocator): Option<number> {
    return this.lookup('partial', name, referrer);
  }

  resolve<T>(handle: number): T {
    let registry = this.handleLookup[handle];
    return registry.getByHandle(handle) as T;
  }
}
