import type {
  GlimmerTreeChanges,
  Nullable,
  SimpleDocument,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';

import { BLACKLIST_TABLE, DOMOperations } from './operations';

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

const WHITESPACE =
  /[\t\n\v\f\r \xa0\u{1680}\u{180e}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}]/u;

export function isWhitespace(string: string) {
  return WHITESPACE.test(string);
}

export class DOMChangesImpl extends DOMOperations implements GlimmerTreeChanges {
  protected namespace: Nullable<string>;

  constructor(protected override document: SimpleDocument) {
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

export const DOMChanges = DOMChangesImpl;
export { DOMTreeConstruction } from './api';
