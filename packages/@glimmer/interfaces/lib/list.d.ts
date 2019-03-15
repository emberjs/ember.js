import { Option, Drop, DropSymbol, ChildrenSymbol } from './core';

export interface LinkedListNode {
  next: Option<LinkedListNode>;
  prev: Option<LinkedListNode>;
}

export interface ListNode<T> extends LinkedListNode {
  next: Option<ListNode<T>>;
  prev: Option<ListNode<T>>;
  value: T;
}

// we are unable to express the constraint that T's .prev and .next are
// themselves T. However, it will always be true, so trust us.
type trust = any;

export interface LinkedList<T extends LinkedListNode> extends Slice<T>, Drop {
  head(): Option<T>;
  tail(): Option<T>;
  clear(): void;
  toArray(): T[];
  nextNode(node: T): T;
  forEachNode(callback: (node: T) => void): void;
  insertBefore(node: T, reference?: Option<T>): T;
  append(node: T): T;
  remove(node: T): T;
  [DropSymbol](): void;
  [ChildrenSymbol]: Iterable<Drop>;
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

export interface ListSlice<T extends LinkedListNode> extends Slice<T> {
  forEachNode(callback: (node: T) => void): void;
  head(): Option<T>;
  tail(): Option<T>;
  toArray(): T[];
  nextNode(node: T): Option<T>;
}
