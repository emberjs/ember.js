import type {
  AttrNamespace,
  Bounds,
  Dict,
  DOMRenderer,
  ElementNamespace,
  Indexable,
  Namespace,
  Nullable,
  SimpleComment,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from '@glimmer/interfaces';
import {
  COMMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
  ELEMENT_NODE,
  INSERT_BEFORE_BEGIN,
  INSERT_BEFORE_END,
  NS_MATHML,
  NS_SVG,
  TEXT_NODE,
} from '@glimmer/constants/lib/dom';
import { expect } from '@glimmer/debug-util/lib/platform-utils';

import { ConcreteBounds } from '../bounds';

// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = { foreignObject: 1, desc: 1, title: 1 };

// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
const BLACKLIST_TABLE = Object.create(null) as Dict<1>;

[
  'b',
  'big',
  'blockquote',
  'body',
  'br',
  'center',
  'code',
  'dd',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'hr',
  'i',
  'img',
  'li',
  'listing',
  'main',
  'meta',
  'nobr',
  'ol',
  'p',
  'pre',
  'ruby',
  's',
  'small',
  'span',
  'strong',
  'strike',
  'sub',
  'sup',
  'table',
  'tt',
  'u',
  'ul',
  'var',
].forEach((tag) => (BLACKLIST_TABLE[tag] = 1));

/**
 * The `DOMRenderer` for a browser `Document`, and for a SimpleDOM document.
 *
 * Do not read or write a member of a DOM node in other runtime code.
 * Add a method here and to `DOMRenderer`.
 */
export class DOMRendererImpl implements DOMRenderer {
  declare protected uselessElement: SimpleElement; // Set by this.setupUselessElement() in constructor

  constructor(protected document: SimpleDocument) {
    this.setupUselessElement();
  }

  // split into separate method so that NodeDOMRenderer
  // can override it.
  protected setupUselessElement() {
    this.uselessElement = this.document.createElement('div');
  }

  createElement(tag: string, context?: SimpleElement): SimpleElement {
    let isElementInSVGNamespace: boolean,
      isHTMLIntegrationPoint: boolean,
      isElementInMathMlNamespace: boolean,
      ns: Namespace;

    if (context) {
      isElementInSVGNamespace = context.namespaceURI === NS_SVG || tag === 'svg';
      isElementInMathMlNamespace = context.namespaceURI === NS_MATHML || tag === 'math';
      isHTMLIntegrationPoint = !!(SVG_INTEGRATION_POINTS as Dict<number>)[context.tagName];
    } else {
      isElementInSVGNamespace = tag === 'svg';
      isElementInMathMlNamespace = tag === 'math';
      isHTMLIntegrationPoint = false;
    }

    if ((isElementInMathMlNamespace || isElementInSVGNamespace) && !isHTMLIntegrationPoint) {
      // FIXME: This does not properly handle <font> with color, face, or
      // size attributes, which is also disallowed by the spec. We should fix
      // this.
      if (BLACKLIST_TABLE[tag]) {
        throw new Error(`Cannot create a ${tag} inside an SVG context`);
      }
      if (isElementInMathMlNamespace) {
        ns = NS_MATHML;
      } else {
        ns = NS_SVG;
      }

      return this.document.createElementNS(ns, tag);
    } else {
      return this.document.createElement(tag);
    }
  }

  createElementNS(namespace: ElementNamespace, tag: string): SimpleElement {
    return this.document.createElementNS(namespace, tag);
  }

  createTextNode(text: string): SimpleText {
    return this.document.createTextNode(text);
  }

  createComment(data: string): SimpleComment {
    return this.document.createComment(data);
  }

  insertBefore(parent: SimpleElement, node: SimpleNode, reference: Nullable<SimpleNode>) {
    parent.insertBefore(node, reference);
  }

  insertHTMLBefore(parent: SimpleElement, nextSibling: Nullable<SimpleNode>, html: string): Bounds {
    if (html === '') {
      const comment = this.createComment('');
      parent.insertBefore(comment, nextSibling);
      return new ConcreteBounds(parent, comment, comment);
    }

    const prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
    let last: SimpleNode;

    if (nextSibling === null) {
      parent.insertAdjacentHTML(INSERT_BEFORE_END, html);
      last = expect(parent.lastChild, 'bug in insertAdjacentHTML?');
    } else if (nextSibling instanceof HTMLElement) {
      nextSibling.insertAdjacentHTML('beforebegin', html);
      last = expect(nextSibling.previousSibling, 'bug in insertAdjacentHTML?');
    } else {
      // Non-element nodes do not support insertAdjacentHTML, so add an
      // element and call it on that element. Then remove the element.
      const { uselessElement } = this;

      parent.insertBefore(uselessElement, nextSibling);
      uselessElement.insertAdjacentHTML(INSERT_BEFORE_BEGIN, html);
      last = expect(uselessElement.previousSibling, 'bug in insertAdjacentHTML?');
      parent.removeChild(uselessElement);
    }

    const first = expect(prev ? prev.nextSibling : parent.firstChild, 'bug in insertAdjacentHTML?');
    return new ConcreteBounds(parent, first, last);
  }

  removeChild(parent: SimpleElement, node: SimpleNode): void {
    parent.removeChild(node);
  }

  clearChildren(element: SimpleElement): void {
    while (element.lastChild) {
      element.removeChild(element.lastChild);
    }
  }

  parentNode(node: SimpleNode): Nullable<SimpleNode> {
    return node.parentNode;
  }

  firstChild(node: SimpleNode): Nullable<SimpleNode> {
    return node.firstChild;
  }

  lastChild(node: SimpleNode): Nullable<SimpleNode> {
    return node.lastChild;
  }

  nextSibling(node: SimpleNode): Nullable<SimpleNode> {
    return node.nextSibling;
  }

  previousSibling(node: SimpleNode): Nullable<SimpleNode> {
    return node.previousSibling;
  }

  querySelector(element: SimpleElement, selector: string): Nullable<SimpleElement> {
    return (element as unknown as Element).querySelector(
      selector
    ) as unknown as Nullable<SimpleElement>;
  }

  isNode(value: unknown): value is SimpleNode {
    return (
      value !== null &&
      typeof value === 'object' &&
      typeof (value as Indexable)['nodeType'] === 'number'
    );
  }

  isFragment(value: unknown): value is SimpleDocumentFragment {
    return (
      value !== null &&
      typeof value === 'object' &&
      (value as Indexable)['nodeType'] === DOCUMENT_FRAGMENT_NODE
    );
  }

  isElement(node: SimpleNode): node is SimpleElement {
    return node.nodeType === ELEMENT_NODE;
  }

  isText(node: SimpleNode): node is SimpleText {
    return node.nodeType === TEXT_NODE;
  }

  isComment(node: SimpleNode): node is SimpleComment {
    return node.nodeType === COMMENT_NODE;
  }

  tagName(element: SimpleElement): string {
    return element.tagName;
  }

  namespaceURI(element: SimpleElement): Nullable<string> {
    return element.namespaceURI;
  }

  nodeValue(node: SimpleNode): Nullable<string> {
    return node.nodeValue;
  }

  setNodeValue(node: SimpleNode, value: string): void {
    (node as SimpleText | SimpleComment).nodeValue = value;
  }

  attributeNames(element: SimpleElement): string[] {
    let { attributes } = element;
    let names: string[] = [];

    for (let i = 0; i < attributes.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      names.push(attributes[i]!.name);
    }

    return names;
  }

  getAttribute(element: SimpleElement, name: string): Nullable<string> {
    return element.getAttribute(name);
  }

  setAttribute(
    element: SimpleElement,
    name: string,
    value: string,
    namespace: Nullable<AttrNamespace> = null
  ) {
    if (namespace) {
      element.setAttributeNS(namespace, name, value);
    } else {
      element.setAttribute(name, value);
    }
  }

  removeAttribute(element: SimpleElement, name: string, namespace: Nullable<AttrNamespace> = null) {
    if (namespace) {
      element.removeAttributeNS(namespace, name);
    } else {
      element.removeAttribute(name);
    }
  }

  hasProperty(element: SimpleElement, name: string): boolean {
    return name in element;
  }

  getProperty(element: SimpleElement, name: string): unknown {
    return (element as unknown as Dict)[name];
  }

  setProperty(element: SimpleElement, name: string, value: unknown): void {
    (element as unknown as Dict)[name] = value;
  }

  addEventListener(
    element: SimpleElement,
    eventName: string,
    callback: EventListener,
    options?: AddEventListenerOptions
  ): void {
    (element as unknown as Element).addEventListener(eventName, callback, options);
  }

  removeEventListener(
    element: SimpleElement,
    eventName: string,
    callback: EventListener,
    options?: AddEventListenerOptions
  ): void {
    (element as unknown as Element).removeEventListener(eventName, callback, options);
  }
}
