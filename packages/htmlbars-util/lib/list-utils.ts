export interface Destroyable {
  destroy();
}

export interface LinkedListNode {
  next: LinkedListNode;
  prev: LinkedListNode;
}

// we are unable to express the constraint that T's .prev and .next are
// themselves T. However, it will always be true, so trust us.
type trust = any;

export class LinkedList<T extends LinkedListNode> {
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

  isEmpty() {
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

  insertBefore(node: T, reference: LinkedListNode = null) {
    if (reference === null) reference = this._tail;

    reference.prev.next = node;
    node.prev = reference.prev;
    node.next = reference;
    reference.prev = node;
  }

  append(node: T) {
    this.insertBefore(node, this._tail);
  }

  prepend(node: T) {
    this.insertBefore(node, this._head.next);
  }

  remove(node: T) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
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
