import type {
  Bounds,
  Cursor,
  RenderAdapter,
  Nullable,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { setLocalDebugType } from '@glimmer/debug-util/lib/debug-brand';

export class CursorImpl implements Cursor {
  constructor(
    public element: SimpleElement,
    public nextSibling: Nullable<SimpleNode>
  ) {
    setLocalDebugType('cursor', this);
  }
}

export type DestroyableBounds = Bounds;

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

export function move(
  adapter: RenderAdapter,
  bounds: Bounds,
  reference: Nullable<SimpleNode>
): Nullable<SimpleNode> {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let current: SimpleNode = first;

  while (true) {
    let next = adapter.nextSibling(current);

    adapter.insertBefore(parent, current, reference);

    if (current === last) {
      return next;
    }

    current = expect(next, 'invalid bounds');
  }
}

export function clear(adapter: RenderAdapter, bounds: Bounds): Nullable<SimpleNode> {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let current: SimpleNode = first;

  while (true) {
    let next = adapter.nextSibling(current);

    adapter.removeChild(parent, current);

    if (current === last) {
      return next;
    }

    current = expect(next, 'invalid bounds');
  }
}
