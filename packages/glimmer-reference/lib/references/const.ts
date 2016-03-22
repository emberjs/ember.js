import { Reference } from '../types';
import { Opaque } from 'glimmer-util';

export const CONST = "29c7034c-f1e1-4cf4-a843-1783dda9b744";

export class ConstReference<T> implements Reference<T> {
  protected inner: T;

  public "29c7034c-f1e1-4cf4-a843-1783dda9b744" = true;

  constructor(inner: T) {
    this.inner = inner;
  }

  // TODO: A protocol for telling Glimmer to stop asking; could also be useful
  // for finalized references. Also, a reference composed only of const references
  // should itself be const.

  isDirty() { return false; }
  value(): T { return this.inner; }
  destroy() {}
}

export function isConst(reference: Reference<Opaque>): boolean {
  return !!reference[CONST];
}
