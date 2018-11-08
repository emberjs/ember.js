import { Simple, Bounds } from '@glimmer/interfaces';
import { Option, Destroyable, expect } from '@glimmer/util';

export class Cursor {
  constructor(public element: Simple.Element, public nextSibling: Option<Simple.Node>) {}
}

export default Bounds;

export type DestroyableBounds = Bounds & Destroyable;

export class ConcreteBounds implements Bounds {
  constructor(
    public parentNode: Simple.Element,
    private first: Simple.Node,
    private last: Simple.Node
  ) {}

  parentElement(): Simple.Element {
    return this.parentNode;
  }

  firstNode(): Simple.Node {
    return this.first;
  }

  lastNode(): Simple.Node {
    return this.last;
  }
}

export class SingleNodeBounds implements Bounds {
  constructor(private parentNode: Simple.Element, private node: Simple.Node) {}

  parentElement(): Simple.Element {
    return this.parentNode;
  }

  firstNode(): Simple.Node {
    return this.node;
  }

  lastNode(): Simple.Node {
    return this.node;
  }
}

export function move(bounds: Bounds, reference: Option<Simple.Node>): Option<Simple.Node> {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let current: Simple.Node = first;

  while (true) {
    let next = current.nextSibling;

    parent.insertBefore(current, reference);

    if (current === last) {
      return next;
    }

    current = expect(next, 'invalid bounds');
  }
}

export function clear(bounds: Bounds): Option<Simple.Node> {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let current: Simple.Node = first;

  while (true) {
    let next = current.nextSibling;

    parent.removeChild(current);

    if (current === last) {
      return next;
    }

    current = expect(next, 'invalid bounds');
  }
}
