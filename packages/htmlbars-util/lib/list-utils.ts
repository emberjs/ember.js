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
  private _head: T;
  private _tail: T;

  constructor() {
    this.clear();
  }

  clone(callback: (input: T) => T): LinkedList<T> {
    let cloned = new LinkedList<T>();

    this.forEachNode(node => {
      cloned.append(callback(node));
    });

    return cloned;
  }

  head(): T {
    let front = this._head.next;
    if (front === this._tail) return null;
    return <trust>front;
  }

  tail(): T {
    let back = this._tail.prev;
    if (back === this._head) return null;
    return <trust>back;
  }

  clear() {
    let head = this._head = <T>new SentinelNode();
    let tail = this._tail = <T>new SentinelNode();
    head.next = tail;
    tail.prev = head;
  }

  isEmpty(): boolean {
    return this._head.next === this._tail;
  }

  toArray(): T[] {
    let out = [];
    this.forEachNode(n => out.push(n));
    return out;
  }

  splice(start: LinkedListNode, end: LinkedListNode, reference: LinkedListNode) {
    reference = reference || this._tail;

    let before = reference.prev;

    before.next = start;
    start.prev = before;

    reference.prev = end;
    end.next = reference;
  }

  spliceList(list: LinkedList<T>, reference: LinkedListNode) {
    this.splice(list.head(), list.tail(), reference);
  }

  nextNode(node: T): T {
    let next = node.next;
    if (next === this._tail) return null;
    return <trust>next;
  }

  prevNode(node: T): T {
    let prev = node.prev;
    if (prev === this._head) return null;
    return <trust>prev;
  }

  forEachNode(callback: (node: T) => void) {
    let node = this._head.next;

    while (node !== this._tail) {
      callback(<trust>node);
      node = node.next;
    }
  }

  insertBefore(node: T, reference: LinkedListNode = null): T {
    if (reference === null) reference = this._tail;

    reference.prev.next = node;
    node.prev = reference.prev;
    node.next = reference;
    reference.prev = node;
    return node;
  }

  append(node: T): T {
    this.insertBefore(node, this._tail);
    return node;
  }

  pop(): T {
    let tail = this.tail();
    if (tail) this.remove(tail);
    return tail;
  }

  prepend(node: T): T {
    this.insertBefore(node, this._head.next);
    return node;
  }

  remove(node: T): T {
    node.prev.next = node.next;
    node.next.prev = node.prev;
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

class SentinelNode implements LinkedListNode {
  next: LinkedListNode = null;
  prev: LinkedListNode = null;
}

export interface Slice<T extends LinkedListNode> {
  head(): T;
  tail(): T;
  nextNode(node: T): T;
  isEmpty(): boolean;
}

export class ListSlice<T extends LinkedListNode> implements Slice<T> {
  private _head: T;
  private _tail: T;

  constructor(head: T, tail: T) {
    this._head = head;
    this._tail = tail;
  }

  head(): T {
    return this._head;
  }

  tail(): T {
    return this._tail;
  }

  nextNode(node: T): T {
    if (node === this._tail) return null;
    return <T>node.next;
  }

  isEmpty() {
    return false;
  }
}