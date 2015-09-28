export class ListNode<T> {
  private value: T;
  public next: ListNode<T> = null;
  public prev: ListNode<T> = null;

  constructor(value: T) {
    this.value = value;
  }
}

export abstract class LinkedList<T> {
  private head: ListNode<T>;
  private tail: ListNode<T>;

  append(val: T): ListNode<T> {
    let node = new ListNode(val);
    let { head, tail } = this;

    if (head) {
      head.next = node;
      node.prev = head;
    } else {
      this.head = node;
    }

    if (tail) {
      node.prev = tail;
      tail.next = node;
    } else {
      this.tail = node;
    }

    return node;
  }

  remove(node: ListNode<T>) {
    let prev = node.prev;
    let next = node.next;

    if (this.head === node) this.head = next;
    if (this.tail === node) this.tail = prev;

    if (next) next.prev = prev;
    if (prev) prev.next = next;

    this.destroyNode(node);
  }

  forEach(callback: (T) => void) {
    let node = this.head;

    while (node) {
      callback(node);
      node = node.next;
    }
  }

  destroy() {

  }

  destroyNode(node: ListNode<T>) {};
}