import { Opaque, SymbolTable, RuntimeResolver, CompileTimeConstants } from '@glimmer/interfaces';

const UNRESOLVED = {};

export const WELL_KNOWN_EMPTY_ARRAY_POSITION = 0;
const WELL_KNOW_EMPTY_ARRAY = Object.freeze([]);
export type EMPTY_ARRAY = Array<ReadonlyArray<never>>;

export interface ConstantPool {
  strings: string[];
  arrays: number[][] | EMPTY_ARRAY;
  handles: number[];
  numbers: number[];
}

export const enum PrimitiveType {
  NUMBER = 0b000,
  FLOAT = 0b001,
  STRING = 0b010,
  BOOLEAN_OR_VOID = 0b011,
  NEGATIVE = 0b100,
  BIG_NUM = 0b101,
}

export class WriteOnlyConstants implements CompileTimeConstants {
  // `0` means NULL

  protected strings: string[] = [];
  protected arrays: number[][] | EMPTY_ARRAY = [WELL_KNOW_EMPTY_ARRAY];
  protected tables: SymbolTable[] = [];
  protected handles: number[] = [];
  protected resolved: Opaque[] = [];
  protected numbers: number[] = [];

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

  handle(handle: number): number {
    let index = this.handles.indexOf(handle);
    if (index > -1) {
      return index;
    }

    this.resolved.push(UNRESOLVED);
    return this.handles.push(handle) - 1;
  }

  serializable(value: Opaque): number {
    let str = JSON.stringify(value);
    let index = this.strings.indexOf(str);
    if (index > -1) {
      return index;
    }

    return this.strings.push(str) - 1;
  }

  number(number: number): number {
    let index = this.numbers.indexOf(number);

    if (index > -1) {
      return index;
    }

    return this.numbers.push(number) - 1;
  }

  toPool(): ConstantPool {
    return {
      strings: this.strings,
      arrays: this.arrays,
      handles: this.handles,
      numbers: this.numbers,
    };
  }
}

export class RuntimeConstants<Locator> {
  protected strings: string[];
  protected arrays: number[][] | EMPTY_ARRAY;
  protected handles: number[];
  protected resolved: Opaque[];
  protected numbers: number[];

  constructor(public resolver: RuntimeResolver<Locator>, pool: ConstantPool) {
    this.strings = pool.strings;
    this.arrays = pool.arrays;
    this.handles = pool.handles;
    this.resolved = this.handles.map(() => UNRESOLVED);
    this.numbers = pool.numbers;
  }

  getString(value: number): string {
    return this.strings[value];
  }

  getNumber(value: number): number {
    return this.numbers[value];
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

  resolveHandle<T>(index: number): T {
    let resolved = this.resolved[index];

    if (resolved === UNRESOLVED) {
      let handle = this.handles[index];
      resolved = this.resolved[index] = this.resolver.resolve(handle);
    }

    return resolved as T;
  }

  getSerializable<T>(s: number): T {
    return JSON.parse(this.strings[s]) as T;
  }
}

export class Constants<Locator> extends WriteOnlyConstants {
  constructor(public resolver: RuntimeResolver<Locator>, pool?: ConstantPool) {
    super();

    if (pool) {
      this.strings = pool.strings;
      this.arrays = pool.arrays;
      this.handles = pool.handles;
      this.resolved = this.handles.map(() => UNRESOLVED);
      this.numbers = pool.numbers;
    }
  }

  getNumber(value: number): number {
    return this.numbers[value];
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

  resolveHandle<T>(index: number): T {
    let resolved = this.resolved[index];

    if (resolved === UNRESOLVED) {
      let handle = this.handles[index];
      resolved = this.resolved[index] = this.resolver.resolve(handle);
    }

    return resolved as T;
  }

  getSerializable<T>(s: number): T {
    return JSON.parse(this.strings[s]) as T;
  }
}

export class LazyConstants extends Constants<Opaque> {
  private others: Opaque[] = [];
  protected serializables: Opaque[] = [];

  serializable(value: Opaque): number {
    let index = this.serializables.indexOf(value);

    if (index > -1) {
      return index;
    }

    return this.serializables.push(value) - 1;
  }

  getSerializable<T>(s: number): T {
    return this.serializables[s] as T;
  }

  getOther<T>(value: number): T {
    return this.others[value - 1] as T;
  }

  other(other: Opaque): number {
    return this.others.push(other);
  }
}
