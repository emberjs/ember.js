import { PathReference } from './reference';

export type Primitive = undefined | null | boolean | number | string;

export class PrimitiveReference<T extends Primitive> implements PathReference<T> {
  constructor(private inner: T) {}

  value() {
    return this.inner;
  }

  isConst() {
    return true;
  }

  get(_key: string): PrimitiveReference<Primitive> {
    return UNDEFINED_REFERENCE;
  }
}

export const UNDEFINED_REFERENCE: PrimitiveReference<undefined> = new PrimitiveReference(undefined);
