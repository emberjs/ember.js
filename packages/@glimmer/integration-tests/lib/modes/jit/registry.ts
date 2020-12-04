import {
  CompilableProgram,
  ResolvedComponentDefinition,
  Invocation,
  Option,
  PartialDefinition,
  Template,
  HelperDefinitionState,
  ModifierDefinitionState,
  InternalComponentManager,
} from '@glimmer/interfaces';
import { assert, dict } from '@glimmer/util';
import { getComponentTemplate } from '@glimmer/manager';

// This is used to replicate a requirement of Ember's template referrers, which
// assign the `owner` to the template meta. The requirement is that the template
// metas should not be serialized, and this prevents serialization by adding a
// circular reference to the template meta.
const CIRCULAR_OBJECT: { inner: { outer?: object } } = { inner: {} };
CIRCULAR_OBJECT.inner.outer = CIRCULAR_OBJECT;

export interface Lookup {
  helper: HelperDefinitionState;
  modifier: ModifierDefinitionState;
  partial: PartialDefinition;
  component: ResolvedComponentDefinition;
  template: Invocation;
  compilable: Template;
  'template-source': string;
}

export type LookupType = keyof Lookup;
export type LookupValue = Lookup[LookupType];

export class TypedRegistry<T> {
  private byName: { [key: string]: T } = dict<T>();

  has(name: string): boolean {
    return name in this.byName;
  }

  get(name: string): Option<T> {
    return this.byName[name];
  }

  register(name: string, value: T): void {
    this.byName[name] = value;
  }
}

export default class Registry {
  helper = new TypedRegistry<HelperDefinitionState>();
  modifier = new TypedRegistry<ModifierDefinitionState>();
  partial = new TypedRegistry<PartialDefinition>();
  component = new TypedRegistry<
    ResolvedComponentDefinition<object, unknown, InternalComponentManager>
  >();
  template = new TypedRegistry<Invocation>();
  compilable: TypedRegistry<CompilableProgram> = new TypedRegistry<CompilableProgram>();
  'template-source' = new TypedRegistry<string>();
}

export class TestJitRegistry {
  private registry = new Registry();

  register<K extends LookupType>(type: K, name: string, value: Lookup[K]): void {
    let registry = this.registry[type] as TypedRegistry<any>;
    registry.register(name, value);
  }

  lookup<K extends LookupType>(type: K, name: string): Option<Lookup[K]> {
    if (this.registry[type].has(name)) {
      return this.registry[type].get(name) as Lookup[K];
    } else {
      return null;
    }
  }

  lookupComponent(name: string): Option<ResolvedComponentDefinition> {
    let definition = this.lookup('component', name);

    if (definition === null) {
      return null;
    }

    let { manager, state } = definition as ResolvedComponentDefinition;

    let capabilities = manager.getCapabilities(state);

    if (definition.template === null) {
      let templateFactory = getComponentTemplate(state);

      assert(
        templateFactory || capabilities.dynamicLayout,
        'expected a template to be associated with this component'
      );

      if (templateFactory) {
        definition.template = templateFactory(CIRCULAR_OBJECT);
      }
    }

    return definition;
  }
}
