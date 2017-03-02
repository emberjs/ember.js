import { CONSTANT_TAG, VersionedReference, Tag } from './validators';

export class ConstReference<T> implements VersionedReference<T> {
  public tag: Tag = CONSTANT_TAG;

  constructor(protected inner: T) { }

  value(): T { return this.inner; }
}

export function isConst(reference: { tag: Tag }): boolean {
  return reference.tag === CONSTANT_TAG;
}
