import { Descriptor } from '@ember/-internals/meta';
import { CHAIN_PASS_THROUGH } from './chain-tags';
import { notifyPropertyChange } from './property_events';

export class HashCompatDescriptor implements Descriptor {
  constructor() {
    CHAIN_PASS_THROUGH.add(this);
  }

  get(obj: object, key: string): unknown {
    return obj[key];
  }

  set(obj: object, key: string, value: unknown): void {
    let currentValue = obj[key];

    obj[key] = value;

    if (currentValue !== value) {
      notifyPropertyChange(obj, key);
    }
  }

  teardown(): void {}
}
