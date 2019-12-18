import { isDestroyable, isStringDestroyable, DESTROY } from './destroy';
import {
  Option,
  SymbolDestroyable,
  Destroyable,
  Drop,
  WillDropSymbol,
  DidDropSymbol,
  ChildrenSymbol,
} from '@glimmer/interfaces';
import { LinkedList, LinkedListNode } from './list-utils';
import { DEVMODE } from '@glimmer/local-debug-flags';
import { symbol } from './platform-utils';

export const LINKED: WeakMap<object, Set<Drop>> = new WeakMap();
export const WILL_DROP: WillDropSymbol = symbol('WILL_DROP');
export const DID_DROP: DidDropSymbol = symbol('DID_DROP');
export const CHILDREN: ChildrenSymbol = symbol('CHILDREN');
export const DESTRUCTORS = new WeakMap();

export function isDrop(value: unknown): value is Drop {
  if (value === null || typeof value !== 'object') return false;
  return DID_DROP in (value as object);
}

export function associate(parent: object, child: object) {
  associateDestructor(parent, destructor(child));
}

export function associateDestructor(parent: object, child: Drop): void {
  let associated = LINKED.get(parent);

  if (!associated) {
    associated = new Set();
    LINKED.set(parent, associated);
  }

  associated.add(child);
}

export function peekAssociated(parent: object): Option<Set<Drop>> {
  return LINKED.get(parent) || null;
}

export function takeAssociated(parent: object): Option<Set<Drop>> {
  let linked = LINKED.get(parent);

  if (linked && linked.size > 0) {
    LINKED.delete(parent);
    return linked;
  } else {
    return null;
  }
}

export function willDestroyAssociated(parent: object) {
  let associated = LINKED.get(parent);

  if (associated) {
    associated.forEach(item => {
      item[WILL_DROP]();
    });
  }
}

export function didDestroyAssociated(parent: object) {
  let associated = LINKED.get(parent);

  if (associated) {
    associated.forEach(item => {
      item[DID_DROP]();
      associated!.delete(item);
    });
  }
}

export function destructor(value: object): Drop {
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

export function snapshot(values: Set<Drop>): Drop {
  return new SnapshotDestructor(values);
}

class SnapshotDestructor implements Drop {
  constructor(private destructors: Set<Drop>) {}

  [WILL_DROP]() {
    this.destructors.forEach(item => item[WILL_DROP]());
  }

  [DID_DROP]() {
    this.destructors.forEach(item => item[DID_DROP]());
  }

  get [CHILDREN](): Iterable<Drop> {
    return this.destructors;
  }

  toString() {
    return 'SnapshotDestructor';
  }
}

class DestroyableDestructor implements Drop {
  constructor(private inner: SymbolDestroyable) {}

  [WILL_DROP]() {
    willDestroyAssociated(this.inner);
  }

  [DID_DROP]() {
    this.inner[DESTROY]();
    didDestroyAssociated(this.inner);
  }

  get [CHILDREN](): Iterable<Drop> {
    return LINKED.get(this.inner) || [];
  }

  toString() {
    return 'DestroyableDestructor';
  }
}

class StringDestroyableDestructor implements Drop {
  constructor(private inner: Destroyable) {}

  [WILL_DROP]() {
    if (typeof this.inner.willDestroy === 'function') {
      this.inner.willDestroy();
    }
    willDestroyAssociated(this.inner);
  }

  [DID_DROP]() {
    this.inner.destroy();
    didDestroyAssociated(this.inner);
  }

  get [CHILDREN](): Iterable<Drop> {
    return LINKED.get(this.inner) || [];
  }

  toString() {
    return 'StringDestroyableDestructor';
  }
}

class SimpleDestructor implements Drop {
  constructor(private inner: object) {}

  [WILL_DROP]() {
    willDestroyAssociated(this.inner);
  }

  [DID_DROP]() {
    didDestroyAssociated(this.inner);
  }

  get [CHILDREN](): Iterable<Drop> {
    return LINKED.get(this.inner) || [];
  }

  toString() {
    return 'SimpleDestructor';
  }
}

export class ListContentsDestructor implements Drop {
  constructor(private inner: LinkedList<LinkedListNode>) {}

  [WILL_DROP]() {
    this.inner.forEachNode(d => destructor(d)[WILL_DROP]());
  }

  [DID_DROP]() {
    this.inner.forEachNode(d => destructor(d)[DID_DROP]());
  }

  get [CHILDREN](): Iterable<Drop> {
    let out: Drop[] = [];
    this.inner.forEachNode(d => out.push(...destructor(d)[CHILDREN]));
    return out;
  }

  toString() {
    return 'ListContentsDestructor';
  }
}

export interface DebugNode {
  inner: object;
  children: DebugNode[] | null;
  hasDrop: boolean;
}

export function debugDropTree(inner: object): DebugNode {
  let hasDrop = isDrop(inner);
  let rawChildren = LINKED.get(inner) || null;
  let children: DebugNode[] | null = null;

  if (rawChildren) {
    children = [];
    for (let child of rawChildren) {
      children.push(debugDropTree(child));
    }
  }

  let obj = Object.create(null);
  obj.inner = inner;
  if (children) {
    obj.children = children;
  }
  obj.hasDrop = hasDrop;
  return obj;
}

export function printDropTree(inner: object) {
  printDrop(destructor(inner));
}

export function printDrop(inner: Drop) {
  console.group(String(inner));

  console.log(inner);

  let children = inner[CHILDREN] || null;
  if (children) {
    for (let child of children) {
      printDrop(child);
    }
  }

  console.groupEnd();
}

if (DEVMODE && typeof window !== 'undefined') {
  (window as any).PRINT_DROP = printDropTree;
}
