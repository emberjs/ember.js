import * as Simple from './dom/interfaces';
import { Option, Destroyable } from '@glimmer/util';

export interface Bounds {
  // a method to future-proof for wormholing; may not be needed ultimately
  parentElement(): Simple.Element;
  firstNode(): Option<Simple.Node>;
  lastNode(): Option<Simple.Node>;
}

export class Cursor {
  constructor(public element: Simple.Element, public nextSibling: Option<Simple.Node>) {}
}

export default Bounds;

export interface DestroyableBounds extends Bounds, Destroyable {}

export class RealDOMBounds implements Bounds {
  constructor(private bounds: Bounds) {}

  parentElement() { return this.bounds.parentElement() as Element; }
  firstNode() { return this.bounds.firstNode() as Node; }
  lastNode() { return this.bounds.lastNode() as Node; }
}

export class ConcreteBounds implements Bounds {
  constructor(public parentNode: Simple.Element, private first: Option<Simple.Node>, private last: Option<Simple.Node>) {}

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

export function move(bounds: Bounds, reference: Option<Simple.Node>) {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let node: Option<Simple.Node> = first;

  while (node) {
    let next = node.nextSibling;
    parent.insertBefore(node, reference);
    if (node === last) return next;
    node = next;
  }

  return null;
}

export function clear(bounds: Bounds): Option<Simple.Node> {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let node: Option<Simple.Node> = first;

  while (node) {
    let next = node.nextSibling;
    parent.removeChild(node);
    if (node === last) return next;
    node = next;
  }

  return null;
}
