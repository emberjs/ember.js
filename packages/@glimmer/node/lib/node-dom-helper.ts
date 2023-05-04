import { Bounds, Option, SimpleDocument, SimpleElement, SimpleNode } from '@glimmer/interfaces';
import { ConcreteBounds, DOMTreeConstruction } from '@glimmer/runtime';
import createHTMLDocument from '@simple-dom/document';

export default class NodeDOMTreeConstruction extends DOMTreeConstruction {
  protected declare document: SimpleDocument; // Hides property on base class
  constructor(doc: Option<SimpleDocument>) {
    super(doc || createHTMLDocument());
  }

  // override to prevent usage of `this.document` until after the constructor
  protected override setupUselessElement() {}

  override insertHTMLBefore(
    parent: SimpleElement,
    reference: Option<SimpleNode>,
    html: string
  ): Bounds {
    let raw = this.document.createRawHTMLSection!(html);
    parent.insertBefore(raw, reference);
    return new ConcreteBounds(parent, raw, raw);
  }

  // override to avoid SVG detection/work when in node (this is not needed in SSR)
  override createElement(tag: string) {
    return this.document.createElement(tag);
  }

  // override to avoid namespace shenanigans when in node (this is not needed in SSR)
  override setAttribute(element: SimpleElement, name: string, value: string) {
    element.setAttribute(name, value);
  }
}
