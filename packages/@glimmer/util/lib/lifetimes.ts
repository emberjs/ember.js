import {
  isDestroyable,
  isStringDestroyable,
  Destroyable,
  DESTROY,
  StringDestroyable,
} from './destroy';
import { Option } from '@glimmer/interfaces';

export const LINKED: WeakMap<object, Set<Destructor>> = new WeakMap();
export const DROP = Symbol();
export const DESTRUCTORS = new WeakMap();

export interface Destructor {
  [DROP](): void;
}

export function associate(parent: object, child: object) {
  associateDestructor(parent, destructor(child));
}

export function associateDestructor(parent: object, child: Destructor): void {
  let associated = LINKED.get(parent);

  if (!associated) {
    associated = new Set();
    LINKED.set(parent, associated);
  }

  associated.add(child);
}

export function takeAssociated(parent: object): Option<Set<Destructor>> {
  let linked = LINKED.get(parent);

  if (linked && linked.size > 0) {
    LINKED.delete(parent);
    return linked;
  } else {
    return null;
  }
}

export function destroyAssociated(parent: object) {
  let associated = LINKED.get(parent);

  if (associated) {
    for (let item of associated) {
      item[DROP]();
      associated.delete(item);
    }
  }
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
