import { ConcreteBounds, SingleNodeBounds, Bounds } from '../bounds';
import { default as applyTableElementFix, fixInnerHTML, requiresInnerHTMLFix } from '../compat/inner-html-fix';
import { default as applySVGElementFix, fixSVG } from '../compat/svg-inner-html-fix';
import applyTextNodeMergingFix from '../compat/text-node-merging-fix';
import * as SimplifiedDOM from './interfaces';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = { foreignObject: 1, desc: 1, title: 1 };

// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
export const BLACKLIST_TABLE = Object.create(null);

([
  "b", "big", "blockquote", "body", "br", "center", "code", "dd", "div", "dl", "dt", "em", "embed",
  "h1", "h2", "h3", "h4", "h5", "h6", "head", "hr", "i", "img", "li", "listing", "main", "meta", "nobr",
  "ol", "p", "pre", "ruby", "s", "small", "span", "strong", "strike", "sub", "sup", "table", "tt", "u",
  "ul", "var"
]).forEach(tag => BLACKLIST_TABLE[tag] = 1);

const WHITESPACE = /[\t-\r \xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/;

export function isWhitespace(string: string) {
  return WHITESPACE.test(string);
}

export function moveNodesBefore(source, target, nextSibling) {
  let first = source.firstChild;
  let last = null;
  let current = first;
  while (current) {
    last = current;
    current = current.nextSibling;
    target.insertBefore(last, nextSibling);
  }
  return [first, last];
}

namespace DOM {
  type Node = SimplifiedDOM.Node;
  type Element = SimplifiedDOM.Element;
  type Document = SimplifiedDOM.Document;
  type Comment = SimplifiedDOM.Comment;
  type Text = SimplifiedDOM.Text;
  type Namespace = SimplifiedDOM.Namespace;

  export abstract class TreeConstruction {
    constructor(private document: Document) {}

    createElement(tag: string): Element {
      return this.document.createElement(tag);
    }

    createElementNS(namespace: Namespace, tag: string): Element {
      return this.document.createElementNS(namespace, tag);
    }

    setAttribute(element: Element, name: string, value: string, namespace?: string) {
      if (namespace) {
        element.setAttributeNS(namespace, name, value);
      } else {
        element.setAttribute(name, value);
      }
    }

    createTextNode(text: string): Text {
      return this.document.createTextNode(text);
    }

    createComment(data: string): Comment {
      return this.document.createComment(data);
    }

    insertBefore(parent: Element, node: Node, reference: Node) {
      parent.insertBefore(node, reference);
    }

    abstract insertHTMLBefore(parent: Element, html: string, reference: Node): Bounds;
  }
}

export class DOMChanges {
  protected document: HTMLDocument;
  protected namespace: string;
  private uselessElement: HTMLElement;
  private uselessAnchor: HTMLAnchorElement;

  constructor(document) {
    this.document = document;
    this.namespace = null;
    this.uselessElement = this.document.createElement('div');
    this.uselessAnchor = this.document.createElement('a');
  }

  setAttribute(element: Element, name: string, value: string) {
    element.setAttribute(name, value);
  }

  setAttributeNS(element: Element, namespace: string, name: string, value: string) {
    element.setAttributeNS(namespace, name, value);
  }

  removeAttribute(element: Element, name: string) {
    element.removeAttribute(name);
  }

  removeAttributeNS(element: Element, namespace: string, name: string) {
    element.removeAttributeNS(namespace, name);
  }

  createTextNode(text: string): Text {
    return this.document.createTextNode(text);
  }

  createComment(data: string): Comment {
    return this.document.createComment(data);
  }

  createElement(tag: string, context: Element): Element {
    let isElementInSVGNamespace = context.namespaceURI === SVG_NAMESPACE || tag === 'svg';
    let isHTMLIntegrationPoint = SVG_INTEGRATION_POINTS[context.tagName];

    if (isElementInSVGNamespace && !isHTMLIntegrationPoint) {
      // FIXME: This does not properly handle <font> with color, face, or
      // size attributes, which is also disallowed by the spec. We should fix
      // this.
      if (BLACKLIST_TABLE[tag]) {
        throw new Error(`Cannot create a ${tag} inside of a <${context.tagName}>, because it's inside an SVG context`);
      }

      return this.document.createElementNS(SVG_NAMESPACE, tag);
    }

    return this.document.createElement(tag);
  }

  insertHTMLBefore(_parent: Element, nextSibling: Node, html: string): Bounds {
    // TypeScript vendored an old version of the DOM spec where `insertAdjacentHTML`
    // only exists on `HTMLElement` but not on `Element`. We actually work with the
    // newer version of the DOM API here (and monkey-patch this method in `./compat`
    // when we detect older browsers). This is a hack to work around this limitation.
    let parent = _parent as HTMLElement;

    let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
    let last;

    if (html === null || html === '') {
      return new ConcreteBounds(parent, null, null);
    }

    if (nextSibling === null) {
      parent.insertAdjacentHTML('beforeEnd', html);
      last = parent.lastChild;
    } else if (nextSibling instanceof HTMLElement) {
      nextSibling.insertAdjacentHTML('beforeBegin', html);
      last = nextSibling.previousSibling;
    } else {
      // Non-element nodes do not support insertAdjacentHTML, so add an
      // element and call it on that element. Then remove the element.
      //
      // This also protects Edge, IE and Firefox w/o the inspector open
      // from merging adjacent text nodes. See ./compat/text-node-merging-fix.ts
      parent.insertBefore(this.uselessElement, nextSibling);
      this.uselessElement.insertAdjacentHTML('beforeBegin', html);
      last = this.uselessElement.previousSibling;
      parent.removeChild(this.uselessElement);
    }

    let first = prev ? prev.nextSibling : parent.firstChild;
    return new ConcreteBounds(parent, first, last);
  }

  insertNodeBefore(parent: Element, node: Node, reference: Node): Bounds {
    if (isDocumentFragment(node)) {
      let { firstChild, lastChild } = node;
      this.insertBefore(parent, node, reference);
      return new ConcreteBounds(parent, firstChild, lastChild);
    } else {
      this.insertBefore(parent, node, reference);
      return new SingleNodeBounds(parent, node);
    }
  }

  insertTextBefore(parent: Element, nextSibling: Node, text: string): Text {
    let textNode = this.createTextNode(text);
    this.insertBefore(parent, textNode, nextSibling);
    return textNode;
  }

  insertBefore(element: Element, node: Node, reference: Node) {
    element.insertBefore(node, reference);
  }

  insertAfter(element: Element, node: Node, reference: Node) {
    this.insertBefore(element, node, reference.nextSibling);
  }
}

function defaultInsertHTMLBefore(this: void, useless: HTMLElement, _parent: Element, nextSibling: Node, html: string): Bounds { // tslint:disable-line
  // TypeScript vendored an old version of the DOM spec where `insertAdjacentHTML`
  // only exists on `HTMLElement` but not on `Element`. We actually work with the
  // newer version of the DOM API here (and monkey-patch this method in `./compat`
  // when we detect older browsers). This is a hack to work around this limitation.
  let parent = _parent as HTMLElement;

  let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
  let last;

  if (html === null || html === '') {
    return new ConcreteBounds(parent, null, null);
  }

  if (nextSibling === null) {
    parent.insertAdjacentHTML('beforeEnd', html);
    last = parent.lastChild;
  } else if (nextSibling instanceof HTMLElement) {
    nextSibling.insertAdjacentHTML('beforeBegin', html);
    last = nextSibling.previousSibling;
  } else {
    // Non-element nodes do not support insertAdjacentHTML, so add an
    // element and call it on that element. Then remove the element.
    //
    // This also protects Edge, IE and Firefox w/o the inspector open
    // from merging adjacent text nodes. See ./compat/text-node-merging-fix.ts
    parent.insertBefore(useless, nextSibling);
    useless.insertAdjacentHTML('beforeBegin', html);
    last = useless.previousSibling;
    parent.removeChild(useless);
  }

  let first = prev ? prev.nextSibling : parent.firstChild;
  return new ConcreteBounds(parent, first, last);
}

function fixNodeMerging(this: void, uselessElement: HTMLElement, uselessComment: Comment, _parent: Element, nextSibling: Node, html: string): Bounds { // tslint:disable-line
  let parent = _parent as HTMLElement;

  parent.insertBefore(uselessComment, nextSibling);

  let bounds = insertHTMLBefore(uselessElement, uselessComment, parent, nextSibling, html);

  parent.removeChild(uselessComment);

  return bounds;
}

export function insertHTMLBefore(this: void, uselessElement: HTMLElement, uselessComment: Comment, _parent: Element, nextSibling: Node, html: string): Bounds { // tslint:disable-line
  let parent = _parent as HTMLElement;

  if (html === null || html === '') {
    return defaultInsertHTMLBefore(uselessElement, parent, nextSibling, html);
  }

  let nextPrevious = nextSibling ? nextSibling.previousSibling : parent.lastChild;

  if (nextPrevious && nextPrevious instanceof Text) {
    return fixNodeMerging(uselessElement, uselessComment, parent, nextSibling, html);
  }

  if (requiresInnerHTMLFix(parent)) {
    return fixInnerHTML(uselessElement, parent, nextSibling, html);
  }

  if (parent.namespaceURI === SVG_NAMESPACE) {
    return fixSVG(uselessElement, parent, nextSibling, html);
  }

  return defaultInsertHTMLBefore(uselessElement, parent, nextSibling, html);
}

function isDocumentFragment(node: Node): node is DocumentFragment {
  return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

let helper = DOMChanges;
let doc = typeof document === 'undefined' ? undefined : document;

helper = applyTextNodeMergingFix(doc, helper);
helper = applyTableElementFix(doc, helper);
helper = applySVGElementFix(doc, helper, SVG_NAMESPACE);

export default helper;
export const DOMTreeConstruction = DOM.TreeConstruction;
export type DOMTreeConstruction = DOM.TreeConstruction;
export { Namespace as DOMNamespace } from './interfaces';
