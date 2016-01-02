import { ConstReference, PathReference } from 'glimmer-reference';

export class PrimitiveReference extends ConstReference<any> implements PathReference {
  get(): PathReference {
    return NULL_REFERENCE;
  }
}

export const NULL_REFERENCE = new PrimitiveReference(null);