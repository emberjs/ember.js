import { Bounds, ConcreteBounds } from '../bounds';
import { applySVGInnerHTMLFix } from '../compat/svg-inner-html-fix';
import { applyTextNodeMergingFix } from '../compat/text-node-merging-fix';
import { Simple } from '@glimmer/interfaces';

import { Option, expect } from '@glimmer/util';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = { foreignObject: 1, desc: 1, title: 1 };

// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
export const BLACKLIST_TABLE = Object.create(null);

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
].forEach(tag => (BLACKLIST_TABLE[tag] = 1));

const WHITESPACE = /[\t-\r \xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/;

let doc: Option<Document> = typeof document === 'undefined' ? null : document;

export function isWhitespace(string: string) {
  return WHITESPACE.test(string);
}

export function moveNodesBefore(
  source: Simple.Node,
  target: Simple.Element,
  nextSibling: Option<Simple.Node>
): Bounds {
  let first = expect(source.firstChild, 'source is empty');
  let last: Simple.Node = first;
  let current: Option<Simple.Node> = first;

  while (current) {
    let next: Option<Simple.Node> = current.nextSibling;

    target.insertBefore(current, nextSibling);

    last = current;
    current = next;
  }

  return new ConcreteBounds(target, first, last);
}

export class DOMOperations {
  protected uselessElement!: Simple.Element; // Set by this.setupUselessElement() in constructor

  constructor(protected document: Simple.Document) {
    this.setupUselessElement();
  }

  // split into seperate method so that NodeDOMTreeConstruction
  // can override it.
  protected setupUselessElement() {
    this.uselessElement = this.document.createElement('div') as HTMLElement;
  }

  createElement(tag: string, context?: Simple.Element): Simple.Element {
    let isElementInSVGNamespace: boolean, isHTMLIntegrationPoint: boolean;

    if (context) {
      isElementInSVGNamespace = context.namespaceURI === SVG_NAMESPACE || tag === 'svg';
      isHTMLIntegrationPoint = SVG_INTEGRATION_POINTS[context.tagName];
    } else {
      isElementInSVGNamespace = tag === 'svg';
      isHTMLIntegrationPoint = false;
    }

    if (isElementInSVGNamespace && !isHTMLIntegrationPoint) {
      // FIXME: This does not properly handle <font> with color, face, or
      // size attributes, which is also disallowed by the spec. We should fix
      // this.
      if (BLACKLIST_TABLE[tag]) {
        throw new Error(`Cannot create a ${tag} inside an SVG context`);
      }

      return this.document.createElementNS(SVG_NAMESPACE, tag);
    } else {
      return this.document.createElement(tag);
    }
  }

  insertBefore(parent: Simple.Element, node: Simple.Node, reference: Option<Simple.Node>) {
    parent.insertBefore(node, reference);
  }

  insertHTMLBefore(parent: Simple.Element, nextSibling: Option<Simple.Node>, html: string): Bounds {
    if (html === '') {
      let comment = this.createComment('');
      parent.insertBefore(comment, nextSibling);
      return new ConcreteBounds(parent, comment, comment);
    }

    let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
    let last: Simple.Node;

    if (nextSibling === null) {
      parent.insertAdjacentHTML('beforeend', html);
      last = expect(parent.lastChild, 'bug in insertAdjacentHTML?');
    } else if (nextSibling instanceof HTMLElement) {
      nextSibling.insertAdjacentHTML('beforebegin', html);
      last = expect(nextSibling.previousSibling, 'bug in insertAdjacentHTML?');
    } else {
      // Non-element nodes do not support insertAdjacentHTML, so add an
      // element and call it on that element. Then remove the element.
      //
      // This also protects Edge, IE and Firefox w/o the inspector open
      // from merging adjacent text nodes. See ./compat/text-node-merging-fix.ts
      let { uselessElement } = this;

      parent.insertBefore(uselessElement, nextSibling);
      uselessElement.insertAdjacentHTML('beforebegin', html);
      last = expect(uselessElement.previousSibling, 'bug in insertAdjacentHTML?');
      parent.removeChild(uselessElement);
    }

    let first = expect(prev ? prev.nextSibling : parent.firstChild, 'bug in insertAdjacentHTML?');
    return new ConcreteBounds(parent, first, last);
  }

  createTextNode(text: string): Simple.Text {
    return this.document.createTextNode(text);
  }

  createComment(data: string): Simple.Comment {
    return this.document.createComment(data);
  }
}

export namespace DOM {
  export class TreeConstruction extends DOMOperations {
    createElementNS(namespace: Simple.Namespace, tag: string): Simple.Element {
      return this.document.createElementNS(namespace, tag);
    }

    setAttribute(
      element: Simple.Element,
      name: string,
      value: string,
      namespace: Option<string> = null
    ) {
      if (namespace) {
        element.setAttributeNS(namespace, name, value);
      } else {
        element.setAttribute(name, value);
      }
    }
  }

  let appliedTreeContruction = TreeConstruction;
  appliedTreeContruction = applyTextNodeMergingFix(
    doc,
    appliedTreeContruction
  ) as typeof TreeConstruction;
  appliedTreeContruction = applySVGInnerHTMLFix(
    doc,
    appliedTreeContruction,
    SVG_NAMESPACE
  ) as typeof TreeConstruction;

  export const DOMTreeConstruction = appliedTreeContruction;
  export type DOMTreeConstruction = TreeConstruction;
}

export class DOMChanges extends DOMOperations {
  protected namespace: Option<string>;

  constructor(protected document: HTMLDocument) {
    super(document);
    this.namespace = null;
  }

  setAttribute(element: Simple.Element, name: string, value: string) {
    element.setAttribute(name, value);
  }

  removeAttribute(element: Simple.Element, name: string) {
    element.removeAttribute(name);
  }

  insertAfter(element: Simple.Element, node: Simple.Node, reference: Simple.Node) {
    this.insertBefore(element, node, reference.nextSibling);
  }
}

let helper = DOMChanges;

helper = applyTextNodeMergingFix(doc, helper) as typeof DOMChanges;
helper = applySVGInnerHTMLFix(doc, helper, SVG_NAMESPACE) as typeof DOMChanges;

export default helper;
export const DOMTreeConstruction = DOM.DOMTreeConstruction;
export type DOMTreeConstruction = DOM.DOMTreeConstruction;
export type DOMNamespace = Simple.Namespace;
