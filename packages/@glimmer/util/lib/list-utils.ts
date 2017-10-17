import { Option } from './platform-utils';

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

  toArray(): T[] {
    let out: T[] = [];
    this.forEachNode(n => out.push(n));
    return out;
  }

  nextNode(node: T): T {
    return node.next as trust;
  }

  forEachNode(callback: (node: T) => void) {
    let node = this._head;

    while (node !== null) {
      callback(node as trust);
      node = node.next as trust;
    }
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

  remove(node: T): T {
    if (node.prev) node.prev.next = node.next;
    else this._head = node.next as trust;

    if (node.next) node.next.prev = node.prev;
    else this._tail = node.prev as trust;

    return node;
  }
}

export interface Slice<T extends LinkedListNode> {
  head(): Option<T>;
  tail(): Option<T>;
  nextNode(node: T): Option<T>;
  forEachNode(callback: (node: T) => void): void;
  toArray(): T[];
}

export interface CloneableListNode extends LinkedListNode {
  clone(): this;
}

export class ListSlice<T extends LinkedListNode> implements Slice<T> {
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
}

export const EMPTY_SLICE = new ListSlice(null, null);
