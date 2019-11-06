import { Tag, createUpdatableTag, combine, update, track } from '@glimmer/tag';
import { property } from './property';
import { VersionedPathReference } from './reference';

export function map<T, U>(
  input: VersionedPathReference<T>,
  callback: (value: T) => U
): VersionedPathReference<U> {
  return new MapReference(input, callback);
}

class MapReference<T, U> implements VersionedPathReference<U> {
  readonly tag: Tag;
  readonly updatable = createUpdatableTag();

  constructor(private inner: VersionedPathReference<T>, private callback: (value: T) => U) {
    this.tag = combine([inner.tag, this.updatable]);
  }

  value(): U {
    let { inner, callback } = this;

    let ret: U;
    let tag = track(() => (ret = callback(inner.value())));
    update(this.updatable, tag);

    return ret!;
  }

  get(key: string): VersionedPathReference {
    return property(this, key);
  }
}
