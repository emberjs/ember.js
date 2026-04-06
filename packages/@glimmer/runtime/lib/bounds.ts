import type {
  Bounds,
  Cursor,
  Nullable,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';
import { expect, setLocalDebugType } from '@glimmer/debug-util';

export class CursorImpl implements Cursor {
  constructor(
    public element: SimpleElement | SimpleDocumentFragment,
    public nextSibling: Nullable<SimpleNode>
  ) {
    setLocalDebugType('cursor', this);
  }
}

export type DestroyableBounds = Bounds;

export class ConcreteBounds implements Bounds {
  constructor(
    public parentNode: SimpleElement | SimpleDocumentFragment,
    private first: SimpleNode,
    private last: SimpleNode
  ) {}

  parentElement(): SimpleElement | SimpleDocumentFragment {
    return this.parentNode;
  }

  firstNode(): SimpleNode {
    return this.first;
  }

  lastNode(): SimpleNode {
    return this.last;
  }
}

export function move(bounds: Bounds, reference: Nullable<SimpleNode>): Nullable<SimpleNode> {
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

export function clear(bounds: Bounds): Nullable<SimpleNode> {
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  // Use the node's actual current parent rather than the stored parentElement.
  // When bounds were rendered into a DocumentFragment that was subsequently
  // appended to a real DOM container, the nodes' parentNode is the container
  // while parentElement() still returns the (now-empty) fragment.
  let parent = (first.parentNode as Nullable<SimpleElement>) ?? bounds.parentElement();

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
