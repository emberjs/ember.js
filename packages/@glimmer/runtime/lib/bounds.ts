import type {
  Bounds,
  Cursor,
  Maybe,
  Nullable,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { setLocalDebugType } from '@glimmer/debug-util/lib/debug-brand';

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
    private parent: SimpleElement | SimpleDocumentFragment,
    private first: SimpleNode,
    private last: SimpleNode
  ) {}

  parentNode(): SimpleElement | SimpleDocumentFragment {
    return this.parent;
  }

  firstNode(): SimpleNode {
    return this.first;
  }

  lastNode(): SimpleNode {
    return this.last;
  }
}

/**
 * `SimpleNode#parentNode` is typed as any node, but the DOM only ever reports an
 * element, a fragment, or a document as a parent, and Glimmer never appends
 * directly to a document. The parent is therefore always an insertion point.
 */
export function parentOf(
  node: Maybe<SimpleNode>
): Nullable<SimpleElement | SimpleDocumentFragment> {
  return (node?.parentNode ?? null) as Nullable<SimpleElement | SimpleDocumentFragment>;
}

/**
 * The parent to mutate through: normally the stored parentNode(), but when the
 * bounds were rendered into a DocumentFragment that was later appended to the
 * DOM, the nodes' live parentNode is the container while the stored parent is
 * the (now-empty) fragment.
 */
export function liveParent(bounds: Bounds): SimpleElement | SimpleDocumentFragment {
  return parentOf(bounds.firstNode()) ?? bounds.parentNode();
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
