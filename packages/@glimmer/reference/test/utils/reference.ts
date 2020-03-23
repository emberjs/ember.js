import { VOLATILE_TAG, VolatileTag } from '@glimmer/validator';
import { Reference, PathReference } from '../..';

export class VolatileReference<T = unknown> implements PathReference<T> {
  constructor(private inner: T) {}

  public tag: VolatileTag = VOLATILE_TAG;

  value() {
    return this.inner;
  }

  update(value: T) {
    this.inner = value;
  }

  get(key: string) {
    return new PropertyReference(this, key);
  }
}

class PropertyReference<T = unknown> implements PathReference<T> {
  constructor(private parent: Reference, private key: string) {}

  public tag: VolatileTag = VOLATILE_TAG;

  value() {
    let parent = this.parent.value();
    let { key } = this;

    if (typeof parent === 'function' || (typeof parent === 'object' && parent !== null)) {
      return (parent as any)[key];
    }
  }

  get(key: string) {
    return new PropertyReference(this, key);
  }
}
