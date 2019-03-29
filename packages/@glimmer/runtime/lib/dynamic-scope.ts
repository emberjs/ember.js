import { DynamicScope, Dict } from '@glimmer/interfaces';
import { assign } from '@glimmer/util';
import { PathReference } from '@glimmer/reference';

export class DefaultDynamicScope implements DynamicScope {
  private bucket: Dict<PathReference>;

  constructor(bucket?: Dict<PathReference>) {
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

  child(): DefaultDynamicScope {
    return new DefaultDynamicScope(this.bucket);
  }
}
