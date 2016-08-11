import * as Simple from './dom/interfaces';

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

  constructor(parent: Simple.Element, first: Simple.Node, last: Simple.Node) {
    // TODO: There should be some real mechanism for upcasting from Simple
    // Elements and Nodes. At the moment, there are no intermediate Simple
    // Nodes, but that will not be true forever. At the moment, this is the
    // place where downcasting occurs.
    this.parentNode = parent as Element;
    this.first = first as Node;
    this.last = last as Node;
  }

  parentElement() { return this.parentNode; }
  firstNode() { return this.first; }
  lastNode() { return this.last; }
}

export class SingleNodeBounds implements Bounds {
  private parentNode: Element;
  private node: Node;

  constructor(parentNode: Simple.Element, node: Simple.Node) {
    this.parentNode = parentNode as Element;
    this.node = node as Node;
  }

  parentElement() { return this.parentNode; }
  firstNode() { return this.node; }
  lastNode() { return this.node; }
}

export function bounds(parent: Simple.Element, first: Simple.Node, last: Simple.Node): Bounds {
  return new ConcreteBounds(parent, first, last);
}

export function single(parent: Simple.Element, node: Simple.Node): Bounds {
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
