import { DynamicScope } from '@glimmer/interfaces';
import { PathReference } from '@glimmer/reference';
import { assign } from '@glimmer/util';

export class TestDynamicScope implements DynamicScope {
  private bucket: any;

  constructor(bucket = null) {
    if (bucket) {
      this.bucket = assign({}, bucket);
    } else {
      this.bucket = {};
    }
  }

  get(key: string): PathReference {
    return this.bucket[key];
  }

  set(key: string, reference: PathReference): PathReference {
    return (this.bucket[key] = reference);
  }

  child(): TestDynamicScope {
    return new TestDynamicScope(this.bucket);
  }
}
