import type { Nullable } from '../core.js';
import type { Bounds } from './bounds.js';
import type { Namespace, SimpleComment, SimpleElement, SimpleNode, SimpleText } from './simple.js';

export interface GlimmerDOMOperations {
  createElement(tag: string, context?: SimpleNode): SimpleElement;
  insertBefore(parent: SimpleNode, node: SimpleNode, reference: Nullable<SimpleNode>): void;
  insertHTMLBefore(parent: SimpleNode, nextSibling: Nullable<SimpleNode>, html: string): Bounds;
  createTextNode(text: string): SimpleText;
  createComment(data: string): SimpleComment;
}

export interface GlimmerTreeChanges extends GlimmerDOMOperations {
  setAttribute(element: SimpleElement, name: string, value: string): void;
  removeAttribute(element: SimpleElement, name: string): void;
  insertAfter(element: SimpleNode, node: SimpleNode, reference: SimpleNode): void;
}

export interface GlimmerTreeConstruction extends GlimmerDOMOperations {
  setAttribute(
    element: SimpleElement,
    name: string,
    value: string,
    namespace?: Nullable<Namespace>
  ): void;
}
