import { RevisionTag, ConstReference, PathReference, Reference } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';

type Primitive = string | number | boolean;

export class PrimitiveReference extends ConstReference<any> implements PathReference<Primitive> {
  get(): PrimitiveReference {
    return UNDEFINED_REFERENCE;
  }
}

export class ConditionalReference implements Reference<boolean> {
  private inner: Reference<any>;
  public tag: RevisionTag;

  constructor(inner: Reference<Opaque>) {
    this.inner = inner;
    this.tag = inner.tag;
  }

  value(): boolean {
    return this.toBool(this.inner.value());
  }

  protected toBool(value: Opaque): boolean {
    return !!value;
  }
}

export const NULL_REFERENCE = new PrimitiveReference(null);
export const UNDEFINED_REFERENCE = new PrimitiveReference(undefined);
