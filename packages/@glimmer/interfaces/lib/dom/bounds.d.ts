import type { Nullable } from '../core';
import type { SimpleElement, SimpleNode } from './simple';

export interface Bounds {
  // a method to future-proof for wormholing; may not be needed ultimately
  parentElement(): SimpleElement;
  firstNode(): SimpleNode;
  lastNode(): SimpleNode;
}

export interface Cursor {
  readonly element: SimpleElement;
  readonly nextSibling: Nullable<SimpleNode>;
}
