import { PathReference } from './reference';
import { UNDEFINED_REFERENCE } from './primitive';

export class ConstReference<T = unknown> implements PathReference<T> {
  constructor(protected inner: T) {}

  value() {
    return this.inner;
  }

  isConst() {
    return true;
  }

  get(_key: string): PathReference {
    return UNDEFINED_REFERENCE;
  }
}
