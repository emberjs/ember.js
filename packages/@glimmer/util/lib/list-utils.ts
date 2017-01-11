import { Option } from './platform-utils';

export interface Destroyable {
  destroy(): void;
}

export interface LinkedListNode {
  next: Option<LinkedListNode>;
  prev: Option<LinkedListNode>;
}

export class ListNode<T> implements LinkedListNode {
  public next: Option<ListNode<T>> = null;
  public prev: Option<ListNode<T>> = null;
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

  private _head: Option<T>;
  private _tail: Option<T>;

  constructor() {
    this.clear();
  }

  head(): Option<T> {
    return this._head;
  }

  tail(): Option<T> {
    return this._tail;
  }

  clear() {
    this._head = this._tail = null;
  }

  isEmpty(): boolean {
    return this._head === null;
  }

  toArray(): T[] {
    let out: T[] = [];
    this.forEachNode(n => out.push(n));
    return out;
  }

  splice(start: T, end: T, reference: T) {
    let before: Option<T>;

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

  insertBefore(node: T, reference: Option<T> = null): T {
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

  pop(): Option<T> {
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

export interface Slice<T extends LinkedListNode> {
  head(): Option<T>;
  tail(): Option<T>;
  nextNode(node: T): Option<T>;
  prevNode(node: T): Option<T>;
  forEachNode(callback: (node: T) => void): void;
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

  private _head: Option<T>;
  private _tail: Option<T>;

  constructor(head: Option<T>, tail: Option<T>) {
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

  head(): Option<T> {
    return this._head;
  }

  tail(): Option<T> {
    return this._tail;
  }

  toArray(): T[] {
    let out: T[] = [];
    this.forEachNode(n => out.push(n));
    return out;
  }

  nextNode(node: T): Option<T> {
    if (node === this._tail) return null;
    return node.next as T;
  }

  prevNode(node: T): Option<T> {
    if (node === this._head) return null;
    return node.prev as T;
  }

  isEmpty() {
    return false;
  }
}

export const EMPTY_SLICE = new ListSlice(null, null);
