import type { Nullable } from '../core.js';
import type { SimpleDocumentFragment, SimpleElement, SimpleNode } from './simple.js';

export interface Bounds {
  // a method to future-proof for wormholing; may not be needed ultimately
  parentElement(): SimpleElement | SimpleDocumentFragment;
  firstNode(): SimpleNode;
  lastNode(): SimpleNode;
}

export interface Cursor {
  readonly element: SimpleElement | SimpleDocumentFragment;
  readonly nextSibling: Nullable<SimpleNode>;
}
