const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SVG_INTEGRATION_POINTS = {foreignObject: 1, desc: 1, title: 1};

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
  
  createTextNode(text: string): Text {
    return this.document.createTextNode(text);
  }

  createComment(data: string): Comment {
    return this.document.createComment(data);
  }
  
  createElement(tag: string, context: Element): Element {
    let isSVG = isSVGElement(context, tag);
    
    if (isSVG) return this.document.createElementNS(SVG_NAMESPACE, tag);
    else return this.document.createElement(tag);
  }

  insertBefore(element: Element, node: Node, reference: Node) {
    element.insertBefore(node, reference);
  }
}

function isSVGElement(context: Element, tagName: string): boolean {
  if (tagName === 'svg') return true;
  else return interiorNamespace(context);
}

function interiorNamespace(element: Element): boolean {
  if (element.namespaceURI === SVG_NAMESPACE && !SVG_INTEGRATION_POINTS[element.tagName]) {
    return true;
  }
  
  return false;
}