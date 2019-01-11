import { GlimmerTreeChanges, GlimmerTreeConstruction } from '@glimmer/interfaces';
import { Option } from '@glimmer/util';
import {
  AttrNamespace,
  ElementNamespace,
  Namespace,
  SimpleDocument,
  SimpleElement,
  SimpleNode,
} from '@simple-dom/interface';
import { applySVGInnerHTMLFix } from '../compat/svg-inner-html-fix';
import { applyTextNodeMergingFix } from '../compat/text-node-merging-fix';
import { DOMOperations, BLACKLIST_TABLE } from './operations';

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

let doc: Option<SimpleDocument> =
  typeof document === 'undefined' ? null : (document as SimpleDocument);

export function isWhitespace(string: string) {
  return WHITESPACE.test(string);
}

export namespace DOM {
  export class TreeConstruction extends DOMOperations implements GlimmerTreeConstruction {
    createElementNS(namespace: ElementNamespace, tag: string): SimpleElement {
      return this.document.createElementNS(namespace, tag);
    }

    setAttribute(
      element: SimpleElement,
      name: string,
      value: string,
      namespace: Option<AttrNamespace> = null
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
    Namespace.SVG
  ) as typeof TreeConstruction;

  export const DOMTreeConstruction = appliedTreeContruction;
  export type DOMTreeConstruction = TreeConstruction;
}

export class DOMChangesImpl extends DOMOperations implements GlimmerTreeChanges {
  protected namespace: Option<string>;

  constructor(protected document: SimpleDocument) {
    super(document);
    this.namespace = null;
  }

  setAttribute(element: SimpleElement, name: string, value: string) {
    element.setAttribute(name, value);
  }

  removeAttribute(element: SimpleElement, name: string) {
    element.removeAttribute(name);
  }

  insertAfter(element: SimpleElement, node: SimpleNode, reference: SimpleNode) {
    this.insertBefore(element, node, reference.nextSibling);
  }
}

let helper = DOMChangesImpl;

helper = applyTextNodeMergingFix(doc, helper) as typeof DOMChangesImpl;
helper = applySVGInnerHTMLFix(doc, helper, Namespace.SVG) as typeof DOMChangesImpl;

export default helper;
export const DOMTreeConstruction = DOM.DOMTreeConstruction;
export type DOMTreeConstruction = DOM.DOMTreeConstruction;
export type DOMNamespace = Namespace;
