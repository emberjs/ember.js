import { Opaque, SymbolTable, RuntimeResolver, CompileTimeConstants } from "@glimmer/interfaces";

const UNRESOLVED = {};

const WELL_KNOWN_EMPTY_ARRAY_POSITION = 0;
const WELL_KNOW_EMPTY_ARRAY = Object.freeze([]);
export type EMPTY_ARRAY = Array<ReadonlyArray<never>>;

export interface ConstantPool {
  strings: string[];
  arrays: number[][] | EMPTY_ARRAY;
  tables: SymbolTable[];
  handles: number[];
  serializables: Opaque[];
  floats: number[];
  negatives: number[];
}

export const enum PrimitiveType {
  NUMBER          = 0b000,
  FLOAT           = 0b001,
  STRING          = 0b010,
  BOOLEAN_OR_VOID = 0b011,
  NEGATIVE        = 0b100
}

export class WriteOnlyConstants implements CompileTimeConstants {
  // `0` means NULL

  protected strings: string[] = [];
  protected arrays: number[][] | EMPTY_ARRAY = [WELL_KNOW_EMPTY_ARRAY];
  protected tables: SymbolTable[] = [];
  protected handles: number[] = [];
  protected serializables: Opaque[] = [];
  protected resolved: Opaque[] = [];
  protected floats: number[] = [];
  protected negatives: number[] = [];

  float(float: number) {
    let index = this.floats.indexOf(float);

    if (index > -1) {
      return index;
    }

    return this.floats.push(float) - 1;
  }

  negative(negative: number) {
    return this.negatives.push(negative) - 1;
  }

  string(value: string): number {
    let index = this.strings.indexOf(value);

    if (index > -1) {
      return index;
    }

    return this.strings.push(value) - 1;
  }

  stringArray(strings: string[]): number {
    let _strings: number[] = new Array(strings.length);

    for (let i = 0; i < strings.length; i++) {
      _strings[i] = this.string(strings[i]);
    }

    return this.array(_strings);
  }

  array(values: number[]): number {
    if (values.length === 0) {
      return WELL_KNOWN_EMPTY_ARRAY_POSITION;
    }

    let index = (this.arrays as number[][]).indexOf(values);

    if (index > -1) {
      return index;
    }

    return (this.arrays as number[][]).push(values) - 1;
  }

  table(t: SymbolTable): number {
    let index = this.tables.indexOf(t);

    if (index > -1) {
      return index;
    }

    return this.tables.push(t) - 1;
  }

  handle(handle: number): number {
    this.resolved.push(UNRESOLVED);
    return this.handles.push(handle);
  }

  serializable(value: Opaque): number {
    let index = this.serializables.indexOf(value);

    if (index > -1) {
      return index;
    }

    return this.serializables.push(value) - 1;
  }

  toPool(): ConstantPool {
    return {
      strings: this.strings,
      arrays: this.arrays,
      tables: this.tables,
      handles: this.handles,
      serializables: this.serializables,
      floats: this.floats,
      negatives: this.negatives
    };
  }
}

export class RuntimeConstants<TemplateMeta> {
  protected strings: string[];
  protected arrays: number[][] | EMPTY_ARRAY;
  protected tables: SymbolTable[];
  protected handles: number[];
  protected serializables: Opaque[];
  protected resolved: Opaque[];
  protected floats: number[];
  protected negatives: number[];

  constructor(public resolver: RuntimeResolver<TemplateMeta>, pool: ConstantPool) {
    this.strings = pool.strings;
    this.arrays = pool.arrays;
    this.tables = pool.tables;
    this.handles = pool.handles;
    this.serializables = pool.serializables;
    this.floats = pool.floats;
    this.negatives = pool.negatives;
    this.resolved = this.handles.map(() => UNRESOLVED);
  }

  // `0` means NULL

  getFloat(value: number): number {
    return this.floats[value];
  }

  getNegative(value: number): number {
    return this.negatives[value];
  }

  getString(value: number): string {
    return this.strings[value];
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
    return (this.arrays as number[][])[value];
  }

  getSymbolTable<T extends SymbolTable>(value: number): T {
    return this.tables[value] as T;
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
    return this.serializables[s] as T;
  }
}

export class Constants<TemplateMeta> extends WriteOnlyConstants {
  constructor(public resolver: RuntimeResolver<TemplateMeta>, pool?: ConstantPool) {
    super();

    if (pool) {
      this.strings = pool.strings;
      this.arrays = pool.arrays;
      this.tables = pool.tables;
      this.handles = pool.handles;
      this.serializables = pool.serializables;
      this.floats = pool.floats;
      this.negatives = pool.negatives;
      this.resolved = this.handles.map(() => UNRESOLVED);
    }
  }

  // `0` means NULL
  getFloat(value: number): number {
    return this.floats[value];
  }

  getNegative(value: number): number {
    return this.negatives[value];
  }

  getString(value: number): string {
    return this.strings[value];
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
    return (this.arrays as number[][])[value];
  }

  getSymbolTable<T extends SymbolTable>(value: number): T {
    return this.tables[value] as T;
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
    return this.serializables[s] as T;
  }
}

export class LazyConstants extends Constants<Opaque> {
  private others: Opaque[] = [];

  getOther<T>(value: number): T {
    return this.others[value - 1] as T;
  }

  other(other: Opaque): number {
    return this.others.push(other);
  }
}
