import { WriteOnlyConstants } from '@glimmer/program';
import { RuntimeConstants } from '@glimmer/interfaces';

export default class DebugConstants extends WriteOnlyConstants implements RuntimeConstants {
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
