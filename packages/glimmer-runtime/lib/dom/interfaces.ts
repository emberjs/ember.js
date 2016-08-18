import { FIXME } from 'glimmer-util';
export type FIX_REIFICATION<T> = FIXME<T, 'needs to be reified properly'>;

export type Namespace =
    "http://www.w3.org/1999/xhtml"
  | "http://www.w3.org/1998/Math/MathML"
  | "http://www.w3.org/2000/svg"
  | "http://www.w3.org/1999/xlink"
  | "http://www.w3.org/XML/1998/namespace"
  | "http://www.w3.org/2000/xmlns/";

enum NodeType {
  Element,
  Attribute,
  Text,
  CdataSection,
  EntityReference,
  Entity,
  ProcessingInstruction,
  Comment,
  Document,
  DocumentType,
  DocumentFragment,
  Notation
}

// This is the subset of DOM used by the appending VM. It is
// meant to be efficient to use on the server and all operations
// must be fully serializable to HTML as a transport.
export interface Node {
  nextSibling: Node;
  previousSibling: Node;
  parentNode: Node;
  nodeType: NodeType | number;
  nodeValue: string;
  firstChild: Node;
}

export interface Document extends Node {
  createElement(tag: string): Element;
  createElementNS(namespace: Namespace, tag: string): Element;
  createTextNode(text: string): Text;
  createComment(data: string): Comment;
}

export interface CharacterData extends Node {
  data: string;
}

export interface Text extends CharacterData {}

export interface Comment extends CharacterData {}

export interface Element extends Node {
  namespaceURI: string;
  tagName: string;
  firstChild: Node;
  lastChild: Node;
  removeAttribute(name: string): void;
  removeAttributeNS(namespaceURI: string, name: string);
  setAttribute(name: string, value: string): void;
  setAttributeNS(namespaceURI: string, qualifiedName: string, value: string): void;
  insertBefore(node: Node, reference: Node): void;
  removeChild(node: Node): void;
}

export interface SVGElement extends Element {}

export interface HTMLElement extends Element {}
