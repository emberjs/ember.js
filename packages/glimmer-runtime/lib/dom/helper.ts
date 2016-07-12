import { ConcreteBounds, SingleNodeBounds, Bounds } from '../bounds';
import applyTableElementFix from '../compat/inner-html-fix';
import applySVGElementFix from '../compat/svg-inner-html-fix';
import applyTextNodeMergingFix from '../compat/text-node-merging-fix';

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

class DOMHelper {
  private document: HTMLDocument;
  private namespace: string;
  private uselessElement: HTMLElement;
  private uselessAnchor: HTMLAnchorElement;

  constructor(document) {
    this.document = document;
    this.namespace = null;
    this.uselessElement = this.document.createElement('div');
    this.uselessAnchor = this.document.createElement('a');
  }

  protocolForURL(url: string): string {
    let { uselessAnchor } = this;
    uselessAnchor.href = url;
    return uselessAnchor.protocol;
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

function isDocumentFragment(node: Node): node is DocumentFragment {
  return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

let helper = DOMHelper;
let doc = typeof document === 'undefined' ? undefined : document;

helper = applyTextNodeMergingFix(doc, helper);
helper = applyTableElementFix(doc, helper);
helper = applySVGElementFix(doc, helper, SVG_NAMESPACE);

export default helper;
export { DOMHelper };
