import { WriteOnlyConstants } from '@glimmer/program';
import { assert } from '@glimmer/util';
import { RuntimeConstants, TemplateMeta } from '@glimmer/interfaces';

export default class DebugConstants extends WriteOnlyConstants implements RuntimeConstants {
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

  resolveHandle<T>(s: number): T {
    assert(typeof s === 'number', 'Cannot resolve undefined as a handle');
    return ({ handle: s } as any) as T;
  }

  getTemplateMeta(s: number): TemplateMeta {
    return JSON.parse(this.strings[s]) as TemplateMeta;
  }

  getOther(s: number): unknown {
    return this.others[s];
  }
}
