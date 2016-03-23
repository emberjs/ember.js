import { Reference, CONST_REFERENCE } from '../types';
import { Opaque } from 'glimmer-util';

export class ConstReference<T> implements Reference<T> {
  protected inner: T;

  public "503c5a44-e4a9-4bb5-85bc-102d35af6985" = true;

  constructor(inner: T) {
    this.inner = inner;
  }

  // TODO: A protocol for telling Glimmer to stop asking; could also be useful
  // for finalized references. Also, a reference composed only of const references
  // should itself be const.

  isDirty() { return false; }
  value(): T { return this.inner; }
  destroy() {}
}

export function isConst(reference: Reference<Opaque>): boolean {
  return !!reference[CONST_REFERENCE];
}
