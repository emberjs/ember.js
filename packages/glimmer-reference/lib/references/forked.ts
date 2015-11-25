import { ChainableReference, NotifiableReference, Destroyable } from 'htmlbars-reference';
import { HasGuid } from 'htmlbars-util';

export default class ForkedReference implements NotifiableReference, HasGuid {
  private reference: ChainableReference;
  private chain: Destroyable;
  public _guid: number = null;
  private dirty: boolean = true;
  
  constructor(reference: ChainableReference) {
    this.reference = reference;
    this._guid = null;
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