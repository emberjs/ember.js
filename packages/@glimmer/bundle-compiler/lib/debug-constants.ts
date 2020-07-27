import { WriteOnlyConstants } from '@glimmer/program';
import { assert } from '@glimmer/util';
import { RuntimeConstants } from '@glimmer/interfaces';

export default class DebugConstants extends WriteOnlyConstants implements RuntimeConstants {
  getNumber(value: number): number {
    return this.values[value] as number;
  }

  getString(value: number): string {
    return this.values[value] as string;
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

  resolveHandle<T>(s: number): T {
    assert(typeof s === 'number', 'Cannot resolve undefined as a handle');
    return ({ handle: s } as any) as T;
  }

  getSerializable(s: number): unknown {
    return JSON.parse(this.values[s] as string);
  }

  getTemplateMeta(m: number): unknown {
    return this.getSerializable(m);
  }

  getOther(s: number): unknown {
    return this.values[s];
  }
}
