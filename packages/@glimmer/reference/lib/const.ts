import { CONSTANT_TAG, VersionedReference, RevisionTag } from './validators';
import { Opaque } from 'glimmer-util';

export class ConstReference<T> implements VersionedReference<T> {
  public tag: RevisionTag = CONSTANT_TAG;

  constructor(protected inner: T) { }

  value(): T { return this.inner; }
}

export function isConst(reference: VersionedReference<Opaque>): boolean {
  return reference.tag === CONSTANT_TAG;
}
