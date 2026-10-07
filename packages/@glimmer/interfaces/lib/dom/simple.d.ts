export type {
  AttrNamespace,
  ElementNamespace,
  InsertPosition,
  Namespace,
  NodeType,
  SerializableElement,
  SerializableNode,
  SimpleAttr,
  SimpleComment,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from '@simple-dom/interface';

import type { SimpleDocumentFragment, SimpleElement } from '@simple-dom/interface';

/**
 * A node that Glimmer appends children to. A `ShadowRoot` is a
 * `DocumentFragment`, so rendering into shadow DOM needs the union.
 */
export type SimpleParentNode = SimpleElement | SimpleDocumentFragment;
