import { RevisionTag, ConstReference, PathReference, Reference } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';

export type Primitive = undefined | null | boolean | number | string;

export class PrimitiveReference<T extends Primitive> extends ConstReference<T> implements PathReference<T> {
  static create(value: undefined): PrimitiveReference<undefined>;
  static create(value: null): PrimitiveReference<null>;
  static create(value: boolean): PrimitiveReference<boolean>;
  static create(value: number): PrimitiveReference<number>;
  static create(value: string): PrimitiveReference<string>;
  static create(value: Primitive): PrimitiveReference<Primitive> {
    if (value === undefined) {
      return UNDEFINED_REFERENCE;
    } else if (value === null) {
      return NULL_REFERENCE;
    } else if (value === true) {
      return TRUE_REFERENCE;
    } else if (value === false) {
      return FALSE_REFERENCE;
    } else if (typeof value === 'number') {
      return new ValueReference(value);
    } else {
      return new StringReference(value);
    }
  }

  protected constructor(value: T) {
    super(value);
  }

  get(key: string): PrimitiveReference<Primitive> {
    return UNDEFINED_REFERENCE;
  }
}

class StringReference extends PrimitiveReference<string> {
  private lengthReference: PrimitiveReference<number> = null;

  get(key: string): PrimitiveReference<Primitive> {
    if (key === 'length') {
      let { lengthReference } = this;

      if (lengthReference === null) {
        lengthReference = this.lengthReference = new ValueReference(this.inner.length);
      }

      return lengthReference;
    } else {
      return super.get(key);
    }
  }
}

type Value = undefined | null | number | boolean;

class ValueReference<T extends Value> extends PrimitiveReference<T> {
  constructor(value: T) {
    super(value);
  }
}

export const UNDEFINED_REFERENCE: PrimitiveReference<undefined> = new ValueReference(undefined);
export const NULL_REFERENCE: PrimitiveReference<null> = new ValueReference(null);
const TRUE_REFERENCE: PrimitiveReference<boolean> = new ValueReference(true);
const FALSE_REFERENCE: PrimitiveReference<boolean> = new ValueReference(false);

export class ConditionalReference implements Reference<boolean> {
  public tag: RevisionTag;

  constructor(private inner: Reference<Opaque>) {
    this.tag = inner.tag;
  }

  value(): boolean {
    return this.toBool(this.inner.value());
  }

  protected toBool(value: Opaque): boolean {
    return !!value;
  }
}
