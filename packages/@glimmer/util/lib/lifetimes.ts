import { isDestroyable, isStringDestroyable, DESTROY } from './destroy';
import {
  Option,
  SymbolDestroyable,
  Destroyable,
  Drop,
  DropSymbol,
  ChildrenSymbol,
} from '@glimmer/interfaces';
import { LinkedList, LinkedListNode } from './list-utils';
import { DEVMODE } from '@glimmer/local-debug-flags';

export const LINKED: WeakMap<object, Set<Drop>> = new WeakMap();
export const DROP: DropSymbol = 'DROP [94d46cf3-3974-435d-b278-3e60d1155290]';
export const CHILDREN: ChildrenSymbol = 'CHILDREN [7142e52a-8600-4e01-a773-42055b96630d]';
export const DESTRUCTORS = new WeakMap();

export function isDrop(value: unknown): value is Drop {
  if (value === null || typeof value !== 'object') return false;
  return DROP in (value as object);
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

export function takeAssociated(parent: object): Option<Set<Drop>> {
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
    associated.forEach(item => {
      item[DROP]();
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

  [DROP]() {
    this.destructors.forEach(item => item[DROP]());
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

  [DROP]() {
    this.inner[DESTROY]();
    destroyAssociated(this.inner);
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

  [DROP]() {
    this.inner.destroy();
    destroyAssociated(this.inner);
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

  [DROP]() {
    destroyAssociated(this.inner);
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

  [DROP]() {
    this.inner.forEachNode(d => destructor(d)[DROP]());
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
