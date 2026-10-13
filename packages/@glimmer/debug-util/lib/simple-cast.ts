import type { Maybe, SimpleDocument, SimpleElement, SimpleNode } from '@glimmer/interfaces';

import { unreachable } from './platform-utils';

interface GenericElementTags {
  HTML: HTMLElement;
  SVG: SVGElement;
  ELEMENT: HTMLElement | SVGElement;
}

interface GenericNodeTags {
  NODE: Node;
}

interface BrowserElementTags extends HTMLElementTagNameMap, GenericElementTags {}

interface BrowserTags extends BrowserElementTags, GenericNodeTags {}
type BrowserTag = keyof BrowserTags;

type NodeCheck<N extends Node> = (node: Node) => node is N;
type SugaryNodeCheck<K extends BrowserTag = BrowserTag> = NodeCheck<BrowserTags[K]> | K | K[];
type NodeForSugaryCheck<S extends SugaryNodeCheck> =
  S extends NodeCheck<infer N>
    ? N
    : S extends keyof BrowserTags
      ? BrowserTags[S]
      : S extends (keyof BrowserTags)[]
        ? BrowserTags[S[number]]
        : never;

export function castToSimple(doc: Document | SimpleDocument): SimpleDocument;
export function castToSimple(elem: Element | SimpleElement): SimpleElement;
export function castToSimple(node: Node | SimpleNode): SimpleNode;
export function castToSimple(
  node: Document | Element | Node | SimpleDocument | SimpleElement | SimpleNode
) {
  if (isDocument(node)) {
    return node as SimpleDocument;
  } else if (isSimpleElement(node)) {
    return node;
  } else {
    return node as SimpleNode;
  }
}

function checkError(from: string, check: SugaryNodeCheck): Error {
  return new Error(`cannot cast a ${from} into ${String(check)}`);
}

export const ELEMENT_NODE = 1;
export const DOCUMENT_NODE = 9;

function isDocument(node: Node | SimpleNode | SimpleDocument): node is Document | SimpleDocument {
  return node.nodeType === DOCUMENT_NODE;
}

export function isSimpleElement(node: Maybe<SimpleNode | Node>): node is SimpleElement {
  return node?.nodeType === ELEMENT_NODE;
}

export function isElement(node: Maybe<Node | SimpleNode>): node is Element {
  return node?.nodeType === ELEMENT_NODE && node instanceof Element;
}

export function checkBrowserNode<S extends SugaryNodeCheck>(
  node: Node | SimpleNode | null,
  check: S
): NodeForSugaryCheck<S> {
  let isMatch = false;

  if (node !== null) {
    if (typeof check === 'string') {
      isMatch = stringCheckNode(node, check);
    } else if (Array.isArray(check)) {
      isMatch = check.some((c) => stringCheckNode(node, c));
    } else {
      unreachable();
    }
  }

  if (isMatch && node instanceof Node) {
    return node as NodeForSugaryCheck<S>;
  } else {
    throw checkError(`SimpleElement(${node?.constructor.name ?? 'null'})`, check);
  }
}

function stringCheckNode<S extends BrowserTag>(
  node: Node | SimpleNode,
  check: S
): node is BrowserTags[S] {
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
