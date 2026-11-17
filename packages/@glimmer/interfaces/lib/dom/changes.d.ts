import type { Nullable } from '../core.js';
import type { Bounds } from './bounds.js';
import type {
  Namespace,
  SimpleComment,
  SimpleElement,
  SimpleNode,
  SimpleParentNode,
  SimpleText,
} from './simple.js';

export interface GlimmerDOMOperations {
  createElement(tag: string, context?: SimpleParentNode): SimpleElement;
  insertBefore(parent: SimpleParentNode, node: SimpleNode, reference: Nullable<SimpleNode>): void;
  insertHTMLBefore(
    parent: SimpleParentNode,
    nextSibling: Nullable<SimpleNode>,
    html: string
  ): Bounds;
  createTextNode(text: string): SimpleText;
  createComment(data: string): SimpleComment;
}

export interface GlimmerTreeChanges extends GlimmerDOMOperations {
  setAttribute(element: SimpleElement, name: string, value: string): void;
  removeAttribute(element: SimpleElement, name: string): void;
  insertAfter(element: SimpleParentNode, node: SimpleNode, reference: SimpleNode): void;
}

export interface GlimmerTreeConstruction extends GlimmerDOMOperations {
  setAttribute(
    element: SimpleElement,
    name: string,
    value: string,
    namespace?: Nullable<Namespace>
  ): void;
}
