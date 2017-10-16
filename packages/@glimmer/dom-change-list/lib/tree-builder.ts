import { Simple, Option, NodeTokens } from '@glimmer/interfaces';
import { HTML } from './dom-operations';
import { DOMTreeConstruction } from './tree-construction';
import { NodeToken } from './node-tokens';

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

interface Context {
  tag: string;
  namespaceURI: Simple.Namespace;
  isIntegration: boolean;
}

/**
 * Implements a subset of the HTML Tree Construction
 * algorithm. The idea is you feed in syntactc elements,
 * and the tree constructor will properly handle issues
 * like void tags, namespaces, etc.
 */
export class TreeBuilder {
  private contexts: Context[] = [];

  constructor(private dom: DOMTreeConstruction = new DOMTreeConstruction()) {}

  openElement(tag: string) {
    let context = this.current;
    let isSVG: boolean;

    if (context) {
      isSVG = context.namespaceURI === SVG_NAMESPACE || tag === 'svg';
      isSVG = isSVG && !context.isIntegration;
    } else {
      isSVG = tag === 'svg';
    }

    if (isSVG) {
      if (BLACKLIST_TABLE[tag]) {
        throw new Error(`Cannot create a ${tag} inside an SVG context`);
      }

      this.contexts.push({ tag, namespaceURI: SVG_NAMESPACE, isIntegration: !!SVG_INTEGRATION_POINTS[tag] });
      return this.dom.openElement(tag, SVG_NAMESPACE);
    }

    this.contexts.push({ tag, namespaceURI: HTML, isIntegration: false });
    return this.dom.openElement(tag);
  }

  closeElement() {
    this.dom.closeElement();
  }

  setAttribute(name: string, value: string, namespace?: Simple.Namespace) {
    this.dom.setAttribute(name, value, namespace);
  }

  appendText(text: string): NodeToken {
    return this.dom.appendText(text);
  }

  appendComment(text: string) {
    return this.dom.appendComment(text);
  }

  get currentTag(): Option<string> {
    let current = this.current;
    return current && current.tag;
  }

  get currentNamespace(): Option<Simple.Namespace> {
    let current = this.current;
    return current && current.namespaceURI;
  }

  appendTo(element: Simple.Element | Simple.DocumentFragment, owner: Simple.Document): NodeTokens {
    return this.dom.appendTo(element, owner);
  }

  private get current(): Option<Context> {
    let { contexts } = this;
    let { length } = contexts;

    return length ? contexts[length - 1] : null;
  }
}