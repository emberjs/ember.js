import type { Nullable } from '../core.js';
import type { SimpleNode } from './simple.js';

export interface Bounds {
  // a method to future-proof for wormholing; may not be needed ultimately
  parentElement(): SimpleNode;
  firstNode(): SimpleNode;
  lastNode(): SimpleNode;
}

export interface Cursor {
  readonly element: SimpleNode;
  readonly nextSibling: Nullable<SimpleNode>;
}
