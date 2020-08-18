import { createTag, dirtyTag, consumeTag, tagFor } from '@glimmer/validator';
import { Reference, PathReference } from '@glimmer/reference';

/**
 * UpdatableRootReferences aren't directly related to templates, but they are
 * currently used in tests and the `State` helper used for embedding.
 */
export class UpdatableRootReference<T = unknown> implements PathReference<T> {
  constructor(private inner: T) {}

  isConst() {
    return false;
  }

  private tag = createTag();

  value() {
    consumeTag(this.tag);
    return this.inner;
  }

  update(value: T) {
    this.inner = value;
    dirtyTag(this.tag);
  }

  get(key: string) {
    return new ProxyPathReference(this, key);
  }
}

class ProxyPathReference<T = unknown> implements PathReference<T> {
  constructor(private parent: Reference, private key: string) {}

  isConst() {
    return false;
  }

  value() {
    let parent = this.parent.value();
    let { key } = this;

    if (typeof parent === 'function' || (typeof parent === 'object' && parent !== null)) {
      consumeTag(tagFor(parent, key));
      return (parent as any)[key];
    }
  }

  get(key: string) {
    return new ProxyPathReference(this, key);
  }
}
