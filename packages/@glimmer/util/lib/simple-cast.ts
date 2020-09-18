import { unreachable } from './platform-utils';
import { NodeType, SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';

interface GenericElementTags {
  HTML: HTMLElement;
  SVG: SVGElement;
  ELEMENT: HTMLElement | SVGElement;
}

interface GenericNodeTags {
  NODE: Node;
}

type GenericNodeTag = keyof GenericNodeTags;

interface BrowserElementTags extends HTMLElementTagNameMap, GenericElementTags {}
type BrowserElementTag = keyof BrowserElementTags;

interface BrowserTags extends BrowserElementTags, GenericNodeTags {}
type BrowserTag = keyof BrowserTags;

type NodeCheck<N extends Node> = (node: Node) => node is N;
type SugaryNodeCheck<K extends BrowserTag = BrowserTag> = NodeCheck<BrowserTags[K]> | K | K[];
type NodeForSugaryCheck<S extends SugaryNodeCheck<BrowserTag>> = S extends NodeCheck<infer N>
  ? N
  : S extends keyof BrowserTags
  ? BrowserTags[S]
  : S extends (keyof BrowserTags)[]
  ? BrowserTags[S[number]]
  : never;

type BrowserNode = Element | Document | DocumentFragment | Text | Comment | Node;

export function castToSimple(doc: Document | SimpleDocument): SimpleDocument;
export function castToSimple(elem: Element | SimpleElement): SimpleElement;
export function castToSimple(node: Node | SimpleNode): SimpleNode;
export function castToSimple(
  node: Document | Element | Node | SimpleDocument | SimpleElement | SimpleNode
) {
  if (isDocument(node)) {
    return node as SimpleDocument;
  } else if (isElement(node)) {
    return node as SimpleElement;
  } else {
    return node as SimpleNode;
  }
}

// If passed a document, verify we're in the browser and return it as a Document
export function castToBrowser(doc: Document | SimpleDocument): Document;
// If we don't know what this is, but the check requires it to be an element,
// the cast will mandate that it's a browser element
export function castToBrowser<S extends SugaryNodeCheck<BrowserElementTag>>(
  node: BrowserNode | SimpleNode,
  check: S
): NodeForSugaryCheck<S>;
// Finally, if it's a more generic check, the cast will mandate that it's a
// browser node and return a BrowserNodeUtils corresponding to the check
export function castToBrowser<S extends SugaryNodeCheck<GenericNodeTag>>(
  element: BrowserNode | SimpleNode,
  check: S
): NodeForSugaryCheck<S>;
export function castToBrowser<K extends keyof HTMLElementTagNameMap>(
  element: SimpleElement | Element,
  check: K
): HTMLElementTagNameMap[K];
export function castToBrowser<S extends SugaryNodeCheck>(
  node: SimpleNode | BrowserNode | null | undefined,
  sugaryCheck?: S
): Document | NodeForSugaryCheck<S> | null {
  if (node === null || node === undefined) {
    return null;
  }

  if (typeof document === undefined) {
    throw new Error('Attempted to cast to a browser node in a non-browser context');
  }

  if (isDocument(node)) {
    return node as Document;
  }

  if (node.ownerDocument !== document) {
    throw new Error(
      'Attempted to cast to a browser node with a node that was not created from this document'
    );
  }

  return checkNode<S>(node, sugaryCheck!);
}

function checkError(from: string, check: SugaryNodeCheck): Error {
  return new Error(`cannot cast a ${from} into ${check}`);
}

function isDocument(node: Node | SimpleNode | SimpleDocument): node is Document | SimpleDocument {
  return node.nodeType === NodeType.DOCUMENT_NODE;
}

function isElement(node: Node | SimpleNode | SimpleElement): node is Element | SimpleElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

export function checkNode<S extends SugaryNodeCheck>(
  node: Node | null,
  check: S
): NodeForSugaryCheck<S> {
  let isMatch = false;

  if (node !== null) {
    if (typeof check === 'string') {
      isMatch = stringCheckNode(node, check as BrowserTag);
    } else if (Array.isArray(check)) {
      isMatch = check.some((c) => stringCheckNode(node, c as BrowserTag));
    } else {
      throw unreachable();
    }
  }

  if (isMatch) {
    return node as NodeForSugaryCheck<S>;
  } else {
    throw checkError(`SimpleElement(${node})`, check);
  }
}

function stringCheckNode<S extends BrowserTag>(node: Node, check: S): node is BrowserTags[S] {
  switch (check) {
    case 'NODE':
      return true;
    case 'HTML':
      return node instanceof HTMLElement;
    case 'SVG':
      return node instanceof SVGElement;
    case 'ELEMENT':
      return node instanceof Element;
    default:
      if (check.toUpperCase() === check) {
        throw new Error(`BUG: this code is missing handling for a generic node type`);
      }
      return node instanceof Element && node.tagName.toLowerCase() === check;
  }
}
