import type { Bounds, Cursor, Nullable, SimpleNode } from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { setLocalDebugType } from '@glimmer/debug-util/lib/debug-brand';

export class CursorImpl implements Cursor {
  constructor(
    public element: SimpleNode,
    public nextSibling: Nullable<SimpleNode>
  ) {
    setLocalDebugType('cursor', this);
  }
}

export type DestroyableBounds = Bounds;

export class ConcreteBounds implements Bounds {
  constructor(
    private parent: SimpleNode,
    private first: SimpleNode,
    private last: SimpleNode
  ) {}

  parentNode(): SimpleNode {
    return this.parent;
  }

  firstNode(): SimpleNode {
    return this.first;
  }

  lastNode(): SimpleNode {
    return this.last;
  }
}

// The parent to mutate through: normally the stored parentNode(), but when the
// bounds were rendered into a DocumentFragment that was later appended to the
// DOM, the nodes' live parentNode is the container while the stored parent is
// the (now-empty) fragment.
function liveParent(bounds: Bounds): SimpleNode {
  return bounds.firstNode().parentNode ?? bounds.parentNode();
}

export function move(bounds: Bounds, reference: Nullable<SimpleNode>): Nullable<SimpleNode> {
  let parent = liveParent(bounds);
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
  let parent = liveParent(bounds);
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
