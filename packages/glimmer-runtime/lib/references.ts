import { RevisionTag, ConstReference, PathReference, Reference } from 'glimmer-reference';
import { Option, Opaque } from 'glimmer-util';

export type Primitive = undefined | null | boolean | number | string;

export class PrimitiveReference<T extends Primitive> extends ConstReference<T> implements PathReference<T> {
  static create<T extends Primitive>(value: T): PrimitiveReference<T> {
    if (value === undefined) {
      return UNDEFINED_REFERENCE as PrimitiveReference<T>;
    } else if (value === null) {
      return NULL_REFERENCE as PrimitiveReference<T>;
    } else if (value === true) {
      return TRUE_REFERENCE as PrimitiveReference<T>;
    } else if (value === false) {
      return FALSE_REFERENCE as PrimitiveReference<T>;
    } else if (typeof value === 'number') {
      return new ValueReference(value as number) as PrimitiveReference<T>;
    } else {
      return new StringReference(value as string) as any as PrimitiveReference<T>;
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
  private lengthReference: Option<PrimitiveReference<number>> = null;

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
