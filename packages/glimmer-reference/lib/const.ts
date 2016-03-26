import { CONSTANT_TAG, VersionedReference } from './validators';
import Reference from './reference';
import { Opaque } from 'glimmer-util';

export const CONST_REFERENCE = "503c5a44-e4a9-4bb5-85bc-102d35af6985";

export class ConstReference<T> implements VersionedReference<T> {
  protected inner: T;
  public tag = CONSTANT_TAG;

  public "503c5a44-e4a9-4bb5-85bc-102d35af6985" = true;

  constructor(inner: T) {
    this.inner = inner;
  }

  value(): T { return this.inner; }
}

export function isConst(reference: Reference<Opaque>): boolean {
  return !!reference[CONST_REFERENCE];
}
