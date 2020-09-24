import { CompileTimeConstants, ConstantPool, RuntimeConstants } from '@glimmer/interfaces';
import { assert, constants } from '@glimmer/util';

const WELL_KNOWN_EMPTY_ARRAY: unknown = Object.freeze([]);
const STARTER_CONSTANTS = constants(WELL_KNOWN_EMPTY_ARRAY);
const WELL_KNOWN_EMPTY_ARRAY_POSITION: number = STARTER_CONSTANTS.indexOf(WELL_KNOWN_EMPTY_ARRAY);

export class CompileTimeConstantImpl implements CompileTimeConstants {
  // `0` means NULL

  protected values: unknown[] = STARTER_CONSTANTS.slice();
  protected indexMap: Map<unknown, number> = new Map(
    this.values.map((value, index) => [value, index])
  );

  value(value: unknown) {
    let indexMap = this.indexMap;
    let index = indexMap.get(value);

    if (index === undefined) {
      index = this.values.push(value) - 1;
      indexMap.set(value, index);
    }

    return index;
  }

  array(values: unknown[]): number {
    if (values.length === 0) {
      return WELL_KNOWN_EMPTY_ARRAY_POSITION;
    }

    let handles: number[] = new Array(values.length);

    for (let i = 0; i < values.length; i++) {
      handles[i] = this.value(values[i]);
    }

    return this.value(handles);
  }

  serializable(value: unknown): number {
    let str = JSON.stringify(value);

    return this.value(str);
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

  getValue<T>(handle: number) {
    return this.values[handle] as T;
  }

  getArray<T>(value: number): T[] {
    let handles = this.getValue(value) as number[];
    let reified: T[] = new Array(handles.length);

    for (let i = 0; i < handles.length; i++) {
      let n = handles[i];
      reified[i] = this.getValue(n);
    }

    return reified;
  }

  getSerializable<T>(s: number): T {
    return JSON.parse(this.values[s] as string) as T;
  }
}

export class ConstantsImpl extends CompileTimeConstantImpl implements RuntimeConstants {
  protected reifiedArrs: { [key: number]: unknown[] } = {
    [WELL_KNOWN_EMPTY_ARRAY_POSITION]: WELL_KNOWN_EMPTY_ARRAY as unknown[],
  };

  getValue<T>(index: number) {
    assert(index >= 0, `cannot get value for handle: ${index}`);

    return this.values[index] as T;
  }

  getArray<T>(index: number): T[] {
    let reifiedArrs = this.reifiedArrs;
    let reified = reifiedArrs[index] as T[];

    if (reified === undefined) {
      let names: number[] = this.getValue(index);
      reified = new Array(names.length);

      for (let i = 0; i < names.length; i++) {
        reified[i] = this.getValue(names[i]);
      }

      reifiedArrs[index] = reified;
    }

    return reified;
  }

  getSerializable<T>(s: number): T {
    return JSON.parse(this.getValue(s)) as T;
  }

  getOther(s: number): unknown {
    return this.getValue(s);
  }
}
