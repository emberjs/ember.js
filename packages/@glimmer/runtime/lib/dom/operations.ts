import {
  SimpleElement,
  SimpleDocument,
  Namespace,
  SimpleNode,
  InsertPosition,
  SimpleText,
  SimpleComment,
} from '@simple-dom/interface';
import { Dict, Option, Bounds } from '@glimmer/interfaces';
import { ConcreteBounds } from '../bounds';
import { expect } from '@glimmer/util';

// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = { foreignObject: 1, desc: 1, title: 1 };

// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
export const BLACKLIST_TABLE = Object.create(null);

export class DOMOperations {
  protected uselessElement!: SimpleElement; // Set by this.setupUselessElement() in constructor

  constructor(protected document: SimpleDocument) {
    this.setupUselessElement();
  }

  // split into seperate method so that NodeDOMTreeConstruction
  // can override it.
  protected setupUselessElement() {
    this.uselessElement = this.document.createElement('div');
  }

  createElement(tag: string, context?: SimpleElement): SimpleElement {
    let isElementInSVGNamespace: boolean, isHTMLIntegrationPoint: boolean;

    if (context) {
      isElementInSVGNamespace = context.namespaceURI === Namespace.SVG || tag === 'svg';
      isHTMLIntegrationPoint = !!(SVG_INTEGRATION_POINTS as Dict<number>)[context.tagName];
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

      return this.document.createElementNS(Namespace.SVG, tag);
    } else {
      return this.document.createElement(tag);
    }
  }

  insertBefore(parent: SimpleElement, node: SimpleNode, reference: Option<SimpleNode>) {
    parent.insertBefore(node, reference);
  }

  insertHTMLBefore(parent: SimpleElement, nextSibling: Option<SimpleNode>, html: string): Bounds {
    if (html === '') {
      let comment = this.createComment('');
      parent.insertBefore(comment, nextSibling);
      return new ConcreteBounds(parent, comment, comment);
    }

    let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
    let last: SimpleNode;

    if (nextSibling === null) {
      parent.insertAdjacentHTML(InsertPosition.beforeend, html);
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
      uselessElement.insertAdjacentHTML(InsertPosition.beforebegin, html);
      last = expect(uselessElement.previousSibling, 'bug in insertAdjacentHTML?');
      parent.removeChild(uselessElement);
    }

    let first = expect(prev ? prev.nextSibling : parent.firstChild, 'bug in insertAdjacentHTML?');
    return new ConcreteBounds(parent, first, last);
  }

  createTextNode(text: string): SimpleText {
    return this.document.createTextNode(text);
  }

  createComment(data: string): SimpleComment {
    return this.document.createComment(data);
  }
}

export function moveNodesBefore(
  source: SimpleNode,
  target: SimpleElement,
  nextSibling: Option<SimpleNode>
): Bounds {
  let first = expect(source.firstChild, 'source is empty');
  let last: SimpleNode = first;
  let current: Option<SimpleNode> = first;

  while (current) {
    let next: Option<SimpleNode> = current.nextSibling;

    target.insertBefore(current, nextSibling);

    last = current;
    current = next;
  }

  return new ConcreteBounds(target, first, last);
}
