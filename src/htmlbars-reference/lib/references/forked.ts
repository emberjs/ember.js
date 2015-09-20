import { guid } from '../utils';
import { ChainableReference, NotifiableReference, Destroyable } from 'htmlbars-reference';

export default class ForkedReference implements NotifiableReference {
  private reference: ChainableReference;
  private guid: number;
  private dirty: boolean;
  private chain: Destroyable;
  
  constructor(reference: ChainableReference) {
    this.reference = reference;
    this.guid = guid();
    this.dirty = true;

    this.chain = reference.chain(this);
  }

  notify() {
    this.dirty = true;
  }

  isDirty() {
    return this.dirty;
  }

  value() {
    this.dirty = false;
    return this.reference.value();
  }

  destroy() {
    this.chain.destroy();
  }

  label() {
    return '[reference Leaf]';
  }
}

export function fork(reference: ChainableReference): ForkedReference {
  return new ForkedReference(reference);
}