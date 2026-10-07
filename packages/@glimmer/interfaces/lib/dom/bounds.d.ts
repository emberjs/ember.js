import type { Nullable } from '../core.js';
import type { SimpleDocumentFragment, SimpleElement, SimpleNode } from './simple.js';

export interface Bounds {
  // Like DOM's parentNode, this may be an Element, a DocumentFragment, or a
  // Document (DOM's parentElement is always an Element or null, which is why
  // this is not named parentElement).
  parentNode(): SimpleElement | SimpleDocumentFragment;
  firstNode(): SimpleNode;
  lastNode(): SimpleNode;
}

export interface Cursor {
  readonly element: SimpleElement | SimpleDocumentFragment;
  readonly nextSibling: Nullable<SimpleNode>;
}
