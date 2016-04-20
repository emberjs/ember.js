export interface Bounds {
  // a method to future-proof for wormholing; may not be needed ultimately
  parentElement(): Element;
  firstNode(): Node;
  lastNode(): Node;
}

export class Cursor {
  constructor(public element: Element, public nextSibling: Node) {}
}

export default Bounds;

export class ConcreteBounds implements Bounds {
  public parentNode: Element;
  private first: Node;
  private last: Node;

  constructor(parent: Element, first: Node, last: Node) {
    this.parentNode = parent;
    this.first = first;
    this.last = last;
  }

  parentElement() { return this.parentNode; }
  firstNode() { return this.first; }
  lastNode() { return this.last; }
}

export class SingleNodeBounds implements Bounds {
  private parentNode: Element;
  private node: Node;

  constructor(parentNode: Element, node: Node) {
    this.parentNode = parentNode;
    this.node = node;
  }

  parentElement() { return this.parentNode; }
  firstNode() { return this.node; }
  lastNode() { return this.node; }
}

export function bounds(parent: Element, first: Node, last: Node): Bounds {
  return new ConcreteBounds(parent, first, last);
}

export function single(parent: Element, node: Node): Bounds {
  return new SingleNodeBounds(parent, node);
}

export function move(bounds: Bounds, reference: Node) {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let node = first;

  while (node) {
    let next = node.nextSibling;
    parent.insertBefore(node, reference);
    if (node === last) return next;
    node = next;
  }

  return null;
}

export function clear(bounds: Bounds): Node {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let node = first;

  while (node) {
    let next = node.nextSibling;
    parent.removeChild(node);
    if (node === last) return next;
    node = next;
  }

  return null;
}
