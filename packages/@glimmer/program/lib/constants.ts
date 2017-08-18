import { Opaque, SymbolTable, Resolver } from "@glimmer/interfaces";
import { CompileTimeConstants } from "@glimmer/opcode-compiler";

const UNRESOLVED = {};

export interface ConstantPool {
  strings: string[];
  arrays: number[][];
  tables: SymbolTable[];
  handles: number[];
  serializables: Opaque[];
  floats: number[];
}

export const enum PrimitiveType {
  NUMBER          = 0b00,
  FLOAT           = 0b01,
  STRING          = 0b10,
  BOOLEAN_OR_VOID = 0b11
}

export class WriteOnlyConstants implements CompileTimeConstants {
  // `0` means NULL

  protected strings: string[] = [];
  protected arrays: number[][] = [];
  protected tables: SymbolTable[] = [];
  protected handles: number[] = [];
  protected serializables: Opaque[] = [];
  protected resolved: Opaque[] = [];
  protected floats: number[] = [];

  float(float: number) {
    let index = this.floats.length;
    this.floats.push(float);
    return index + 1;
  }

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

  handle(handle: number): number {
    let index = this.handles.length;
    this.handles.push(handle);
    this.resolved.push(UNRESOLVED);
    return index + 1;
  }

  serializable(value: Opaque): number {
    let index = this.serializables.length;
    this.serializables.push(value);
    return index + 1;
  }

  toPool(): ConstantPool {
    return {
      strings: this.strings,
      arrays: this.arrays,
      tables: this.tables,
      handles: this.handles,
      serializables: this.serializables,
      floats: this.floats
    };
  }
}

export class RuntimeConstants<Specifier> {
  protected strings: string[];
  protected arrays: number[][];
  protected tables: SymbolTable[];
  protected handles: number[];
  protected serializables: Opaque[];
  protected resolved: Opaque[];
  protected floats: number[];

  constructor(public resolver: Resolver<Specifier>, pool: ConstantPool) {
    this.strings = pool.strings;
    this.arrays = pool.arrays;
    this.tables = pool.tables;
    this.handles = pool.handles;
    this.serializables = pool.serializables;
    this.floats = pool.floats;
    this.resolved = this.handles.map(() => UNRESOLVED);
  }

  // `0` means NULL

  getFloat(value: number): number {
    return this.floats[value - 1];
  }

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

  resolveHandle<T>(s: number): T {
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

export class Constants<Specifier> extends WriteOnlyConstants {
  constructor(public resolver: Resolver<Specifier>, pool?: ConstantPool) {
    super();

    if (pool) {
      this.strings = pool.strings;
      this.arrays = pool.arrays;
      this.tables = pool.tables;
      this.handles = pool.handles;
      this.serializables = pool.serializables;
      this.resolved = this.handles.map(() => UNRESOLVED);
    }
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

  resolveHandle<T>(s: number): T {
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

export class LazyConstants extends Constants<Opaque> {
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
