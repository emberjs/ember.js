import { WriteOnlyConstants } from "@glimmer/program";
import { SymbolTable } from "@glimmer/interfaces";

export default class DebugConstants extends WriteOnlyConstants {
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
    return { handle: s } as any as T;
  }

  getSerializable<T>(s: number): T {
    return this.serializables[s] as T;
  }
}
