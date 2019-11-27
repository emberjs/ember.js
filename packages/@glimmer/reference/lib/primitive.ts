import { CONSTANT_TAG, Tag } from '@glimmer/validator';
import { VersionedPathReference } from './reference';

export type Primitive = undefined | null | boolean | number | string;

export class PrimitiveReference<T extends Primitive> implements VersionedPathReference<T> {
  readonly tag: Tag = CONSTANT_TAG;

  constructor(private inner: T) {}

  value(): T {
    return this.inner;
  }

  get(_key: string): PrimitiveReference<Primitive> {
    return UNDEFINED_REFERENCE;
  }
}

export const UNDEFINED_REFERENCE: PrimitiveReference<undefined> = new PrimitiveReference(undefined);
