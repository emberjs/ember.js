import { ChainableReference, NotifiableReference } from 'glimmer-reference';
import { HasGuid } from 'glimmer-util';

export default class ForkedReference<T> implements NotifiableReference<T>, HasGuid {
  private reference: ChainableReference<T>;
  // private chain: Destroyable;
  public _guid: number = null;
  private dirty: boolean = true;

  constructor(reference: ChainableReference<T>) {
    this.reference = reference;
    this._guid = null;
    this.dirty = true;

    // this.chain = reference.chain(this);
  }

  notify() {
    this.dirty = true;
  }

  isDirty() {
    return true;
  }

  value() {
    this.dirty = false;
    return this.reference.value();
  }

  destroy() {
    // this.chain.destroy();
  }

  label() {
    return '[reference Leaf]';
  }
}

export function fork<T>(reference: ChainableReference<T>): ForkedReference<T> {
  return new ForkedReference(reference);
}
