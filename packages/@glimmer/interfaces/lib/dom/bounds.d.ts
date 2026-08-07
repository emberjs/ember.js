import type { Nullable } from '../core.js';
import type { SimpleNode } from './simple.js';

export interface Bounds {
  // Like DOM's parentNode, this may be an Element, a DocumentFragment, or a
  // Document (DOM's parentElement is always an Element or null, which is why
  // this is not named parentElement).
  parentNode(): SimpleNode;
  firstNode(): SimpleNode;
  lastNode(): SimpleNode;
}

export interface Cursor {
  readonly element: SimpleNode;
  readonly nextSibling: Nullable<SimpleNode>;
}
