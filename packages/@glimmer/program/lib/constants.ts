import { CompileTimeConstants, ConstantPool, RuntimeConstants } from '@glimmer/interfaces';

export const WELL_KNOWN_EMPTY_ARRAY_POSITION = 0;
const WELL_KNOW_EMPTY_ARRAY = Object.freeze([]);

export class WriteOnlyConstants implements CompileTimeConstants {
  // `0` means NULL

  protected values: unknown[] = [WELL_KNOW_EMPTY_ARRAY];
  protected indexMap: Map<unknown, number> = new Map();

  protected value(value: unknown) {
    let indexMap = this.indexMap;
    let index = indexMap.get(value);

    if (index === undefined) {
      index = this.values.push(value) - 1;
      indexMap.set(value, index);
    }

    return index;
  }

  other(other: unknown): number {
    return this.value(other);
  }

  string(value: string): number {
    return this.value(value);
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

    return this.value(values);
  }

  serializable(value: unknown): number {
    let str = JSON.stringify(value);

    return this.value(str);
  }

  templateMeta(value: unknown): number {
    return this.serializable(value);
  }

  number(number: number): number {
    return this.value(number);
  }

  toPool(): ConstantPool {
    return this.values;
  }
}

export class RuntimeConstantsImpl implements RuntimeConstants {
  protected values: unknown[];

  constructor(pool: ConstantPool) {
    this.values = pool;
  }

  getString(value: number): string {
    return this.values[value] as string;
  }

  getNumber(value: number): number {
    return this.values[value] as number;
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
    return this.values[value] as number[];
  }

  getSerializable<T>(s: number): T {
    return JSON.parse(this.values[s] as string) as T;
  }

  getTemplateMeta<T>(m: number): T {
    return this.getSerializable(m);
  }

  getOther<T>(value: number): T {
    return this.values[value] as T;
  }
}

export class JitConstants extends WriteOnlyConstants implements RuntimeConstants {
  protected reifiedStringArrs: string[][] = [WELL_KNOW_EMPTY_ARRAY as any];

  templateMeta(meta: unknown): number {
    return this.value(meta);
  }

  getValue<T>(index: number) {
    return this.values[index] as T;
  }

  getNumber(value: number): number {
    return this.getValue(value);
  }

  getString(value: number): string {
    return this.getValue(value);
  }

  getStringArray(value: number): string[] {
    let reifiedStringArrs = this.reifiedStringArrs;
    let reified = reifiedStringArrs[value];

    if (reified === undefined) {
      let names = this.getArray(value);
      reified = new Array(names.length);

      for (let i = 0; i < names.length; i++) {
        reified[i] = this.getValue(names[i]);
      }

      reifiedStringArrs[value] = reified;
    }

    return reified;
  }

  getArray(value: number): number[] {
    return this.getValue(value);
  }

  getSerializable<T>(s: number): T {
    return JSON.parse(this.getValue(s)) as T;
  }

  getTemplateMeta<T>(m: number): T {
    return this.getValue(m);
  }

  getOther<T>(value: number): T {
    return this.getValue(value);
  }
}
