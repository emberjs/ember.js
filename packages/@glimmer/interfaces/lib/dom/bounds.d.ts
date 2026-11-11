import type { Nullable } from '../core.js';
import type { SimpleNode, SimpleParentNode } from './simple.js';

export interface Bounds {
  // Despite the name this can be a DocumentFragment, such as a ShadowRoot.
  parentElement(): SimpleParentNode;
  firstNode(): SimpleNode;
  lastNode(): SimpleNode;
}

export interface Cursor {
  readonly element: SimpleParentNode;
  readonly nextSibling: Nullable<SimpleNode>;
}
