import { ChainableReference } from '../types';

export class ConstReference<T> implements ChainableReference {
  protected inner: T;

  constructor(inner: T) {
    this.inner = inner;
  }

  // TODO: A protocol for telling HTMLBars to stop asking; could also be useful
  // for finalized references. Also, a reference composed only of const references
  // should itself be const.

  isDirty() { return false; }
  value(): T { return this.inner; }
  chain() { return null; }
  destroy() {}
}