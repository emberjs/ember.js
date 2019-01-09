import { Bounds, Cursor, SymbolDestroyable } from '@glimmer/interfaces';
import { expect, Option } from '@glimmer/util';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';

export class CursorImpl implements Cursor {
  constructor(public element: SimpleElement, public nextSibling: Option<SimpleNode>) {}
}

export type DestroyableBounds = Bounds & SymbolDestroyable;

export class ConcreteBounds implements Bounds {
  constructor(
    public parentNode: SimpleElement,
    private first: SimpleNode,
    private last: SimpleNode
  ) {}

  parentElement(): SimpleElement {
    return this.parentNode;
  }

  firstNode(): SimpleNode {
    return this.first;
  }

  lastNode(): SimpleNode {
    return this.last;
  }
}

export class SingleNodeBounds implements Bounds {
  constructor(private parentNode: SimpleElement, private node: SimpleNode) {}

  parentElement(): SimpleElement {
    return this.parentNode;
  }

  firstNode(): SimpleNode {
    return this.node;
  }

  lastNode(): SimpleNode {
    return this.node;
  }
}

export function move(bounds: Bounds, reference: Option<SimpleNode>): Option<SimpleNode> {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let current: SimpleNode = first;

  while (true) {
    let next = current.nextSibling;

    parent.insertBefore(current, reference);

    if (current === last) {
      return next;
    }

    current = expect(next, 'invalid bounds');
  }
}

export function clear(bounds: Bounds): Option<SimpleNode> {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let current: SimpleNode = first;

  while (true) {
    let next = current.nextSibling;

    parent.removeChild(current);

    if (current === last) {
      return next;
    }

    current = expect(next, 'invalid bounds');
  }
}
