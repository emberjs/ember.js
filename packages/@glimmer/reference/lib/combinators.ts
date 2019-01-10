import { VersionedPathReference, Tag } from './validators';

export function map<T, U>(
  input: VersionedPathReference<T>,
  callback: (value: T) => U
): VersionedPathReference<U> {
  return new MapReference(input, callback);
}

class MapReference<T, U> implements VersionedPathReference<U> {
  readonly tag: Tag;

  constructor(private inner: VersionedPathReference<T>, private callback: (value: T) => U) {
    this.tag = inner.tag;
  }

  value(): U {
    let { inner, callback } = this;

    return callback(inner.value());
  }

  get(key: string): VersionedPathReference {
    throw new Error('unimplemented');
  }
}
