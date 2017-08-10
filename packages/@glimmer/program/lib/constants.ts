import { Opaque, SymbolTable, Resolver } from "@glimmer/interfaces";
import { CompileTimeConstants } from "@glimmer/opcode-compiler";

const UNRESOLVED = {};

export class WriteOnlyConstants<Handle> implements CompileTimeConstants {
  // `0` means NULL

  protected strings: string[] = [];
  protected arrays: number[][] = [];
  protected tables: SymbolTable[] = [];
  protected handles: Handle[] = [];
  protected serializables: Opaque[] = [];
  protected resolved: Opaque[] = [];

  string(value: string): number {
    let index = this.strings.length;
    this.strings.push(value);
    return index + 1;
  }

  stringArray(strings: string[]): number {
    let _strings: number[] = new Array(strings.length);

    for (let i = 0; i < strings.length; i++) {
      _strings[i] = this.string(strings[i]);
    }

    return this.array(_strings);
  }

  array(values: number[]): number {
    let index = this.arrays.length;
    this.arrays.push(values);
    return index + 1;
  }

  table(t: SymbolTable): number {
    let index = this.tables.length;
    this.tables.push(t);
    return index + 1;
  }

  handle(specifier: Handle): number {
    let index = this.handles.length;
    this.handles.push(specifier);
    this.resolved.push(UNRESOLVED);
    return index + 1;
  }

  serializable(value: Opaque): number {
    let index = this.serializables.length;
    this.serializables.push(value);
    return index + 1;
  }
}

export class Constants<Specifier, Handle> extends WriteOnlyConstants<Handle> {
  constructor(public resolver: Resolver<Specifier, Handle>) {
    super();
  }

  // `0` means NULL

  getString(value: number): string {
    return this.strings[value - 1];
  }

  getStringArray(value: number): string[] {
    let names = this.getArray(value);
    let _names: string[] = new Array(names.length);

    for (let i = 0; i < names.length; i++) {
      let n = names[i];
      _names[i] = this.getString(n);
    }

    return _names;
  }

  getArray(value: number): number[] {
    return this.arrays[value - 1];
  }

  getSymbolTable<T extends SymbolTable>(value: number): T {
    return this.tables[value - 1] as T;
  }

  resolveSpecifier<T>(s: number): T {
    let index = s - 1;
    let resolved = this.resolved[index];

    if (resolved === UNRESOLVED) {
      let handle = this.handles[index];
      resolved = this.resolved[index] = this.resolver.resolve(handle);
    }

    return resolved as T;
  }

  getSerializable<T>(s: number): T {
    return this.serializables[s - 1] as T;
  }
}

export class LazyConstants extends Constants<Opaque, Opaque> {
  private others: Opaque[] = [];

  getOther<T>(value: number): T {
    return this.others[value - 1] as T;
  }

  other(other: Opaque): number {
    let index = this.others.length;
    this.others.push(other);
    return index + 1;
  }
}
