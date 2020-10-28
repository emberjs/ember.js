import {
  AnnotatedModuleLocator,
  CompilableProgram,
  CompileTimeComponent,
  ComponentDefinition,
  Helper as GlimmerHelper,
  Invocation,
  ModifierDefinition,
  Option,
  PartialDefinition,
  Template,
  WithStaticLayout,
} from '@glimmer/interfaces';
import { assert, dict } from '@glimmer/util';
import { getComponentTemplate } from '@glimmer/runtime';
import { TestComponentDefinitionState } from '../../components/test-component';

// This is used to replicate a requirement of Ember's template referrers, which
// assign the `owner` to the template meta. The requirement is that the template
// metas should not be serialized, and this prevents serialization by adding a
// circular reference to the template meta.
const CIRCULAR_OBJECT: { inner: { outer?: object } } = { inner: {} };
CIRCULAR_OBJECT.inner.outer = CIRCULAR_OBJECT;

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
    let handle = this.lookup('component', name, referrer);

    if (handle === null) {
      return null;
    }

    let { manager, state } = this.resolve<
      ComponentDefinition<TestComponentDefinitionState, unknown>
    >(handle);

    let capabilities = manager.getCapabilities(state);

    if (state.template === null) {
      let templateFactory = getComponentTemplate(state.ComponentClass);

      assert(
        templateFactory || capabilities.dynamicLayout,
        'expected a template to be associated with this component'
      );

      if (templateFactory) {
        state.template = templateFactory(CIRCULAR_OBJECT);
      }
    }

    return handle;
  }

  lookupCompileTimeComponent(
    name: string,
    referrer: Option<AnnotatedModuleLocator>
  ): Option<CompileTimeComponent> {
    let handle = this.lookupComponentHandle(name, referrer);

    if (handle === null) {
      return null;
    }

    let { manager, state } = this.resolve<ComponentDefinition<unknown, unknown, WithStaticLayout>>(
      handle
    );

    let capabilities = manager.getCapabilities(state);

    if (capabilities.dynamicLayout) {
      return {
        handle: handle,
        capabilities,
        compilable: null,
      };
    }

    return {
      handle: handle,
      capabilities,
      compilable: manager.getStaticLayout(state),
    };
  }

  resolve<T>(handle: number): T {
    let registry = this.handleLookup[handle];
    return registry.getByHandle(handle) as T;
  }
}
