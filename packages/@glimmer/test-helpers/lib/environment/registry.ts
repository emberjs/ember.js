import {
  ComponentDefinition,
  Invocation,
  Helper as GlimmerHelper,
  ModifierManager,
  PartialDefinition
} from '@glimmer/runtime';
import { Option, dict } from '@glimmer/util';

export interface Lookup {
  helper: GlimmerHelper;
  modifier: ModifierManager;
  partial: PartialDefinition;
  component: ComponentDefinition;
  template: Invocation;
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
  modifier: TypedRegistry<ModifierManager> = new TypedRegistry<ModifierManager>();
  partial = new TypedRegistry<PartialDefinition>();
  component: TypedRegistry<ComponentDefinition> = new TypedRegistry<ComponentDefinition>();
  template = new TypedRegistry<Invocation>();
  'template-source' = new TypedRegistry<string>();
}
