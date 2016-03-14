import { ConstReference, PathReference, Reference } from 'glimmer-reference';

type Primitive = string | number | boolean;

export class PrimitiveReference extends ConstReference<any> implements PathReference<Primitive> {
  get(): PrimitiveReference {
    return NULL_REFERENCE;
  }
}

export class ConditionalReference implements Reference<boolean> {
  private inner: Reference<any>;

  constructor(inner: Reference<any>) {
    this.inner = inner;
  }

  value(): boolean {
    return this.toBool(this.inner.value());
  }

  protected toBool(value: any): boolean {
    return !!value;
  }

  isDirty() { return this.inner.isDirty(); }

  destroy() { return this.inner.destroy(); }
}

export const NULL_REFERENCE = new PrimitiveReference(null);
