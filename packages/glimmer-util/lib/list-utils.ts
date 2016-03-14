export interface Destroyable {
  destroy();
}

export interface LinkedListNode {
  next: LinkedListNode;
  prev: LinkedListNode;
}

export class ListNode<T> implements LinkedListNode {
  public next: ListNode<T> = null;
  public prev: ListNode<T> = null;
  public value: T;

  constructor(value: T) {
    this.value = value;
  }
}

// we are unable to express the constraint that T's .prev and .next are
// themselves T. However, it will always be true, so trust us.
type trust = any;

export class LinkedList<T extends LinkedListNode> implements Slice<T> {
  static fromSlice<U extends CloneableListNode>(slice: Slice<U>): LinkedList<U> {
    let list = new LinkedList<U>();
    slice.forEachNode(n => list.append(n.clone()));
    return list;
  }

  private _head: T;
  private _tail: T;

  constructor() {
    this.clear();
  }

  head(): T {
    return this._head;
  }

  tail(): T {
    return this._tail;
  }

  clear() {
    this._head = this._tail = null;
  }

  isEmpty(): boolean {
    return this._head === null;
  }

  toArray(): T[] {
    let out = [];
    this.forEachNode(n => out.push(n));
    return out;
  }

  splice(start: T, end: T, reference: T) {
    let before: T;

    if (reference === null) {
      before = this._tail;
      this._tail = end;
    } else {
      before = <T>reference.prev;
      end.next = reference;
      reference.prev = end;
    }

    if (before) {
      before.next = start;
      start.prev = before;
    }
  }

  spliceList(list: LinkedList<T>, reference: T) {
    if (list.isEmpty()) return;
    this.splice(list.head(), list.tail(), reference);
  }

  nextNode(node: T): T {
    return <trust>node.next;
  }

  prevNode(node: T): T {
    return <trust>node.prev;
  }

  forEachNode(callback: (node: T) => void) {
    let node = this._head;

    while (node !== null) {
      callback(<trust>node);
      node = <trust>node.next;
    }
  }

  contains(needle: T): boolean {
    let node = this._head;

    while (node !== null) {
      if (node === needle) return true;
      node = <trust>node.next;
    }

    return false;
  }

  insertBefore(node: T, reference: T = null): T {
    if (reference === null) return this.append(node);

    if (reference.prev) reference.prev.next = node;
    else this._head = node;

    node.prev = reference.prev;
    node.next = reference;
    reference.prev = node;

    return node;
  }

  append(node: T): T {
    let tail = this._tail;

    if (tail) {
      tail.next = node;
      node.prev = tail;
      node.next = null;
    } else {
      this._head = node;
    }

    return (this._tail = node);
  }

  pop(): T {
    if (this._tail) return this.remove(this._tail);
    return null;
  }

  prepend(node: T): T {
    if (this._head) return this.insertBefore(node, this._head);
    return (this._head = this._tail = node);
  }

  remove(node: T): T {
    if (node.prev) node.prev.next = node.next;
    else this._head = <trust>node.next;

    if (node.next) node.next.prev = node.prev;
    else this._tail = <trust>node.prev;

    return node;
  }
}

class LinkedListRemover implements Destroyable {
  private node: LinkedListNode;

  constructor(node: LinkedListNode) {
    this.node = node;
  }

  destroy() {
    let { prev, next } = this.node;
    prev.next = next;
    next.prev = prev;
  }
}

export interface Slice<T extends LinkedListNode> {
  head(): T;
  tail(): T;
  nextNode(node: T): T;
  prevNode(node: T): T;
  forEachNode(callback: (node: T) => void);
  toArray(): T[];
  isEmpty(): boolean;
  contains(needle: T): boolean;
}

export interface CloneableListNode extends LinkedListNode {
  clone(): this;
}

export class ListSlice<T extends LinkedListNode> implements Slice<T> {
  static toList<U extends CloneableListNode>(slice: Slice<U>): LinkedList<U> {
    let list = new LinkedList<U>();
    slice.forEachNode(n => list.append(n.clone()));
    return list;
  }

  private _head: T;
  private _tail: T;

  constructor(head: T, tail: T) {
    this._head = head;
    this._tail = tail;
  }

  forEachNode(callback: (node: T) => void) {
    let node = this._head;

    while (node !== null) {
      callback(node);
      node = this.nextNode(node);
    }
  }

  contains(needle: T): boolean {
    let node = this._head;

    while (node !== null) {
      if (node === needle) return true;
      node = <trust>node.next;
    }

    return false;
  }

  head(): T {
    return this._head;
  }

  tail(): T {
    return this._tail;
  }

  toArray(): T[] {
    let out = [];
    this.forEachNode(n => out.push(n));
    return out;
  }

  nextNode(node: T): T {
    if (node === this._tail) return null;
    return <T>node.next;
  }

  prevNode(node: T): T {
    if (node === this._head) return null;
    return <T>node.prev;
  }

  isEmpty() {
    return false;
  }
}

export const EMPTY_SLICE = new ListSlice(null, null);