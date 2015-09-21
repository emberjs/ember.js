const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export default class DOMHelper {
	private document: HTMLDocument;
  private namespace: string;
	
	constructor(document) {
		this.document = document;
    this.namespace = null;	
	}
  
  setAttribute(element: HTMLElement, name: string, value: string) {
    element.setAttribute(name, value);
  }
  
  setAttributeNS(element: Element, name: string, value: string, namespace: string) {
    element.setAttributeNS(name, namespace, value);
  }

  removeAttribute(element: Element, name: string) {
    element.removeAttribute(name);
  }
  
  createTextNode(text: string): Text {
    return this.document.createTextNode(text);
  }

  createComment(data: string): Comment {
    return this.document.createComment(data);
  }

  createElement(tag: string, context: Element): Element {
    if (context.namespaceURI === SVG_NAMESPACE || tag === 'svg') {
      // Note: This does not properly handle <font> with color, face, or size attributes, which is also
      // disallowed by the spec. We should fix this.
      if (BLACKLIST_TABLE[tag]) {
        throw new Error(`Cannot create a ${tag} inside of a <${context.tagName}>, because it's inside an SVG context`);
      }

      return this.document.createElementNS(SVG_NAMESPACE, 'svg');
    } else {
      return this.document.createElement(tag);
    }
  }

  insertBefore(element: Element, node: Node, reference: Node) {
    element.insertBefore(node, reference);
  }
}

// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = { foreignObject: 1, desc: 1, title: 1 };

// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
export const BLACKLIST_TABLE = Object.create(null);

let svgBlacklist = [
  "b", "big", "blockquote", "body", "br", "center", "code", "dd", "div", "dl", "dt", "em", "embed",
  "h1", "h2", "h3", "h4", "h5", "h6", "head", "hr", "i", "img", "li", "listing", "main", "meta", "nobr",
  "ol", "p", "pre", "ruby", "s", "small", "span", "strong", "strike", "sub", "sup", "table", "tt", "u",
  "ul", "var"].forEach(tag => BLACKLIST_TABLE[tag] = 1);