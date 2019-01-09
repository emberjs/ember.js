import { CompilableProgram, ComponentDefinition, Invocation } from '@glimmer/interfaces';
import { PartialDefinition } from '@glimmer/opcode-compiler';
import { Helper as GlimmerHelper, ModifierDefinition } from '@glimmer/runtime';
import { dict, Option } from '@glimmer/util';

export interface Lookup {
  helper: GlimmerHelper;
  modifier: ModifierDefinition;
  partial: PartialDefinition;
  component: ComponentDefinition;
  template: Invocation;
  compilable: CompilableProgram;
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
  compilable = new TypedRegistry<CompilableProgram>();
  'template-source' = new TypedRegistry<string>();
}
