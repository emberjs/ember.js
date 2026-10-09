import type {
  CompilableProgram,
  HelperDefinitionState,
  Invocation,
  ModifierDefinitionState,
  Nullable,
  Template,
} from '@glimmer/interfaces';
import { dict } from '@glimmer/util';

export interface Lookup {
  helper: HelperDefinitionState;
  modifier: ModifierDefinitionState;
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

  get(name: string): Nullable<T> {
    return this.byName[name] ?? null;
  }

  register(name: string, value: T): void {
    this.byName[name] = value;
  }
}

export default class Registry {
  helper = new TypedRegistry<HelperDefinitionState>();
  modifier = new TypedRegistry<ModifierDefinitionState>();
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

  lookup<K extends LookupType>(type: K, name: string): Nullable<Lookup[K]> {
    if (this.registry[type].has(name)) {
      return this.registry[type].get(name) as Lookup[K];
    } else {
      return null;
    }
  }
}
