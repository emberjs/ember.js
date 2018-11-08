import {
  Destroyable,
  DESTROY,
  StringDestroyable,
  isDestroyable,
  isStringDestroyable,
} from '@glimmer/util';
import { destroyAssociated } from './link';

export const DROP = Symbol();
export const DESTRUCTORS = new WeakMap();

export interface Destructor {
  [DROP](): void;
}

export function destructor(value: object): Destructor {
  let d = DESTRUCTORS.get(value);

  if (!d) {
    if (isDestroyable(value)) {
      d = new DestroyableDestructor(value);
    } else if (isStringDestroyable(value)) {
      d = new StringDestroyableDestructor(value);
    } else {
      d = new SimpleDestructor(value);
    }

    DESTRUCTORS.set(value, d);
  }

  return d;
}

export function snapshot(values: Set<Destructor>): Destructor {
  return new SnapshotDestructor(values);
}

class SnapshotDestructor implements Destructor {
  constructor(private destructors: Set<Destructor>) {}

  [DROP]() {
    for (let item of this.destructors) {
      item[DROP]();
    }
  }
}

class DestroyableDestructor implements Destructor {
  constructor(private inner: Destroyable) {}

  [DROP]() {
    this.inner[DESTROY]();
    destroyAssociated(this.inner);
  }
}

class StringDestroyableDestructor implements Destructor {
  constructor(private inner: StringDestroyable) {}

  [DROP]() {
    this.inner.destroy();
    destroyAssociated(this.inner);
  }
}

class SimpleDestructor implements Destructor {
  constructor(private inner: object) {}

  [DROP]() {
    destroyAssociated(this.inner);
  }
}
