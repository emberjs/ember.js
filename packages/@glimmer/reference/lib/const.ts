import { CONSTANT_TAG, Tag, VersionedPathReference } from './validators';
import { UNDEFINED_REFERENCE } from './property';

export class ConstReference<T = unknown> implements VersionedPathReference<T> {
  public tag: Tag = CONSTANT_TAG;

  constructor(protected inner: T) {}

  value(): T {
    return this.inner;
  }

  get(_key: string): VersionedPathReference {
    return UNDEFINED_REFERENCE;
  }
}
