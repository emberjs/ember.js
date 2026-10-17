export type NodeType = -1 | 1 | 3 | 8 | 9 | 10 | 11;

export type InsertPosition = 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';

/** Elements in these namespaces have no prefix. */
export type ElementNamespace =
  | 'http://www.w3.org/1999/xhtml'
  | 'http://www.w3.org/2000/svg'
  | 'http://www.w3.org/1998/Math/MathML';

/** Attributes in these namespaces get a prefix. */
export type AttrNamespace =
  | 'http://www.w3.org/1999/xlink'
  | 'http://www.w3.org/2000/xmlns/'
  | 'http://www.w3.org/XML/1998/namespace';

export type Namespace = ElementNamespace | AttrNamespace;

/**
 * The part of the DOM that the VM needs.
 *
 * Each interface here is a supertype of the browser type with the same role.
 * A browser node is assignable with no cast, and so is a node from another
 * DOM implementation that has these members.
 */
export interface SimpleNode {
  readonly ownerDocument: SimpleDocument | null;
  readonly nodeType: number;
  readonly nodeName: string;

  nodeValue: string | null;

  readonly parentNode: SimpleNode | null;
  readonly previousSibling: SimpleNode | null;
  readonly nextSibling: SimpleNode | null;
  readonly firstChild: SimpleNode | null;
  readonly lastChild: SimpleNode | null;
  readonly childNodes: SimpleChildNodes;

  appendChild(newChild: SimpleNode): SimpleNode;
  insertBefore(newChild: SimpleNode, refChild: SimpleNode | null): SimpleNode;
  removeChild(oldChild: SimpleNode): SimpleNode;

  cloneNode(deep?: boolean): SimpleNode;
}

export interface SimpleChildNodes {
  readonly length: number;
  [index: number]: SimpleNode;
  item(index: number): SimpleNode | null;
}

export interface SimpleAttr {
  readonly namespaceURI: string | null;
  readonly prefix: string | null;
  readonly localName: string;
  readonly name: string;
  readonly specified: boolean;
  value: string;
}

export interface SimpleAttrs {
  readonly length: number;
  [index: number]: SimpleAttr;
}

export interface SimpleElement extends SimpleNode {
  readonly namespaceURI: string | null;
  readonly tagName: string;
  readonly attributes: SimpleAttrs;

  insertAdjacentHTML(position: string, html: string): void;

  getAttribute(name: string): string | null;
  getAttributeNS(namespaceURI: string | null, localName: string): string | null;

  removeAttribute(name: string): void;
  removeAttributeNS(namespaceURI: string | null, qualifiedName: string): void;

  setAttribute(name: string, value: string): void;
  setAttributeNS(namespaceURI: string | null, qualifiedName: string, value: string): void;
}

/**
 * The browser types and the Simple DOM types have no member in common
 * for these nodes, other than the members of a node.
 */
export type SimpleText = SimpleNode;
export type SimpleComment = SimpleNode;
export type SimpleDocumentFragment = SimpleNode;

export interface SimpleDocument extends SimpleNode {
  readonly documentElement: SimpleElement;
  readonly head: SimpleElement;
  readonly body: SimpleElement;

  createElement(tag: string): SimpleElement;
  createElementNS(namespace: string, name: string): SimpleElement;

  createTextNode(text: string): SimpleText;
  createComment(data: string): SimpleComment;

  createDocumentFragment(): SimpleDocumentFragment;
}

/**
 * The read-only part of a node that a serializer needs.
 */
export interface SerializableNode {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly nodeValue: string | null;

  readonly nextSibling: SerializableNode | null;
  readonly firstChild: SerializableNode | null;
}

export interface SerializableAttr {
  readonly specified: boolean;
  readonly name: string;
  readonly value: string;
}

export interface SerializableAttrs {
  readonly length: number;
  readonly [index: number]: SerializableAttr;
}

export interface SerializableElement extends SerializableNode {
  readonly namespaceURI: string | null;
  readonly attributes: SerializableAttrs;
}
