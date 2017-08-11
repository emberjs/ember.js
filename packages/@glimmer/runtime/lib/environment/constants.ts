import { Opaque, SymbolTable } from "@glimmer/interfaces";
import { Specifier, Resolver } from '../internal-interfaces';

export type ConstantString = number;
export type ConstantFloat = number;
export type ConstantExpression = number;
export type ConstantSlice = number;
export type ConstantBlock = number;
export type ConstantSymbolTable = number;
export type ConstantArray = number;
export type ConstantOther = number;

const UNRESOLVED = {};

export class Constants {
  constructor(public resolver: Resolver) {}

  // `0` means NULL

  private strings: string[] = [];
  private floats: number[] = [];
  private arrays: number[][] = [];
  private tables: SymbolTable[] = [];
  private specifiers: Specifier[] = [];
  private serializables: Opaque[] = [];
  private resolved: Opaque[] = [];

  getString(value: ConstantString): string {
    return this.strings[value - 1];
  }

  getFloat(value: ConstantFloat): number {
    return this.floats[value - 1];
  }

  float(value: number): ConstantFloat {
    return this.floats.push(value);
  }

  string(value: string): ConstantString {
    return this.strings.push(value);
  }

  getStringArray(value: ConstantArray): string[] {
    let names = this.getArray(value);
    let _names: string[] = new Array(names.length);

    for (let i = 0; i < names.length; i++) {
      let n = names[i];
      _names[i] = this.getString(n);
    }

    return _names;
  }

  stringArray(strings: string[]): ConstantArray {
    let _strings: ConstantString[] = new Array(strings.length);

    for (let i = 0; i < strings.length; i++) {
      _strings[i] = this.string(strings[i]);
    }

    return this.array(_strings);
  }

  getArray(value: ConstantArray): number[] {
    return this.arrays[value - 1];
  }

  array(values: number[]): ConstantArray {
    return this.arrays.push(values);
  }

  getSymbolTable<T extends SymbolTable>(value: ConstantSymbolTable): T {
    return this.tables[value - 1] as T;
  }

  table(t: SymbolTable): ConstantSymbolTable {
    return this.tables.push(t);
  }

  resolveSpecifier<T>(s: number): T {
    let index = s - 1;
    let resolved = this.resolved[index];

    if (resolved === UNRESOLVED) {
      let specifier = this.specifiers[index];
      resolved = this.resolved[index] = this.resolver.resolve(specifier);
    }

    return resolved as T;
  }

  specifier(specifier: Specifier): number {
    this.resolved.push(UNRESOLVED);
    return this.specifiers.push(specifier);
  }

  getSerializable<T>(s: number): T {
    return this.serializable[s - 1] as T;
  }

  serializable(value: Opaque): number {
    return this.serializables.push(value);
  }
}

export class LazyConstants extends Constants {
  private others: Opaque[] = [];

  getOther<T>(value: ConstantOther): T {
    return this.others[value - 1] as T;
  }

  other(other: Opaque): ConstantOther {
    return this.others.push(other);
  }
}
