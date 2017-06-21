import { FIXME, Option } from '../core';
export type FIX_REIFICATION<T> = FIXME<T, 'needs to be reified properly'>;

export type Namespace =
    "http://www.w3.org/1999/xhtml"
  | "http://www.w3.org/1998/Math/MathML"
  | "http://www.w3.org/2000/svg"
  | "http://www.w3.org/1999/xlink"
  | "http://www.w3.org/XML/1998/namespace"
  | "http://www.w3.org/2000/xmlns/";

export enum NodeType {
  Element = 1,
  Attribute = 2,
  Text = 3,
  CdataSection = 4,
  EntityReference = 5,
  Entity = 6,
  ProcessingInstruction = 7,
  Comment = 8,
  Document = 9,
  DocumentType = 10,
  DocumentFragment = 11,
  Notation = 12
}

// This is the subset of DOM used by the appending VM. It is
// meant to be efficient to use on the server and all operations
// must be fully serializable to HTML as a transport.
export interface Node {
  nextSibling: Option<Node>;
  previousSibling: Option<Node>;
  parentNode: Option<Node>;
  nodeType: NodeType;
  nodeValue: Option<string>;
  firstChild: Option<Node>;
  lastChild: Option<Node>;
}

export interface DocumentFragment extends Node {
  nodeType: NodeType.DocumentFragment;
}

export interface Document extends Node {
  nodeType: NodeType.Document;
  createElement(tag: string): Element;
  createElementNS(namespace: Namespace, tag: string): Element;
  createTextNode(text: string): Text;
  createComment(data: string): Comment;
}

export interface CharacterData extends Node {
  data: string;
}

export interface TokenList {
  [index: number]: string;
  length: number;

  add(s: string): void;
  remove(s: string): void;
  contains(s: string): boolean;
}

export interface Text extends CharacterData {
  nodeType: NodeType.Text;
}

export interface Comment extends CharacterData {
  nodeType: NodeType.Comment;
}

export interface Attribute {
  name: string;
  value: string;
}

export interface Attributes {
  [index: number]: Attribute;
  length: number;
}

export interface Element extends Node {
  nodeType: NodeType.Element;
  namespaceURI: Option<string>;
  tagName: string;
  attributes: Attributes;
  removeAttribute(name: string): void;
  removeAttributeNS(namespaceURI: string, name: string): void;
  setAttribute(name: string, value: string): void;
  setAttributeNS(namespaceURI: string, qualifiedName: string, value: string): void;
  insertBefore(node: Node, reference: Option<Node>): void;
  removeChild(node: Node): void;
}

export interface SVGElement extends Element {}

export interface HTMLElement extends Element {}
