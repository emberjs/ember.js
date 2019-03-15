import {
  AnnotatedModuleLocator,
  CompilableProgram,
  CompileTimeComponent,
  ComponentCapabilities,
  ComponentDefinition,
  Helper as GlimmerHelper,
  Invocation,
  ModifierDefinition,
  Option,
  PartialDefinition,
  Template,
} from '@glimmer/interfaces';
import { dict } from '@glimmer/util';
import { createTemplate } from '../../compile';

export interface Lookup {
  helper: GlimmerHelper;
  modifier: ModifierDefinition;
  partial: PartialDefinition;
  component: ComponentDefinition;
  template: Invocation;
  compilable: Template;
  'template-source': string;
}

export type LookupType = keyof Lookup;
export type LookupValue = Lookup[LookupType];

export class TypedRegistry<T> {
  private byName: { [key: string]: number } = dict<number>();
  private byHandle: { [key: number]: T } = dict<T>();

  hasName(name: string): boolean {
    return name in this.byName;
  }

  getHandle(name: string): Option<number> {
    return this.byName[name];
  }

  hasHandle(name: number): boolean {
    return name in this.byHandle;
  }

  getByHandle(handle: number): Option<T> {
    return this.byHandle[handle];
  }

  register(handle: number, name: string, value: T): void {
    this.byHandle[handle] = value;
    this.byName[name] = handle;
  }
}

export default class Registry {
  helper = new TypedRegistry<GlimmerHelper>();
  modifier: TypedRegistry<ModifierDefinition> = new TypedRegistry<ModifierDefinition>();
  partial = new TypedRegistry<PartialDefinition>();
  component: TypedRegistry<ComponentDefinition> = new TypedRegistry<ComponentDefinition>();
  template = new TypedRegistry<Invocation>();
  compilable: TypedRegistry<CompilableProgram> = new TypedRegistry<CompilableProgram>();
  'template-source' = new TypedRegistry<string>();
}

export class TestJitRegistry {
  private handleLookup: TypedRegistry<unknown>[] = [];
  private registry = new Registry();

  register<K extends LookupType>(type: K, name: string, value: Lookup[K]): number {
    let registry = this.registry[type];
    let handle = this.handleLookup.length;
    this.handleLookup.push(registry);
    (this.registry[type] as TypedRegistry<any>).register(handle, name, value);
    return handle;
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

  lookup(
    type: LookupType,
    name: string,
    _referrer?: Option<AnnotatedModuleLocator>
  ): Option<number> {
    if (this.registry[type].hasName(name)) {
      return this.registry[type].getHandle(name);
    } else {
      return null;
    }
  }

  lookupComponentHandle(name: string, referrer?: Option<AnnotatedModuleLocator>): Option<number> {
    return this.lookup('component', name, referrer);
  }

  private getCapabilities(handle: number): ComponentCapabilities {
    let definition = this.resolve<Option<ComponentDefinition>>(handle);
    let { manager, state } = definition!;
    return manager.getCapabilities(state);
  }

  lookupCompileTimeComponent(
    name: string,
    referrer: Option<AnnotatedModuleLocator>
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
