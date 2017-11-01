import { Simple } from '@glimmer/interfaces';
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

export class ConcreteBounds implements Bounds {
  constructor(public parentNode: Simple.Element, private first: Option<Simple.Node>, private last: Option<Simple.Node>) {}

  parentElement() { return this.parentNode; }
  firstNode() { return this.first; }
  lastNode() { return this.last; }
}

export class SingleNodeBounds implements Bounds {

  constructor(private parentNode: Simple.Element,
              private node: Simple.Node) {
  }

  parentElement() { return this.parentNode; }
  firstNode() { return this.node; }
  lastNode() { return this.node; }
}

export function bounds(parent: Simple.Element, first: Simple.Node, last: Simple.Node): ConcreteBounds {
  return new ConcreteBounds(parent, first, last);
}

export function single(parent: Simple.Element, node: Simple.Node): SingleNodeBounds {
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
