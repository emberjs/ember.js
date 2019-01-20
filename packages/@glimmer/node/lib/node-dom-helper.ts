import { Bounds } from '@glimmer/interfaces';
import { ConcreteBounds, DOMTreeConstruction } from '@glimmer/runtime';
import { Option } from '@glimmer/util';
import { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import createHTMLDocument from '@simple-dom/document';

export default class NodeDOMTreeConstruction extends DOMTreeConstruction {
  protected document!: SimpleDocument; // Hides property on base class
  constructor(doc: Option<SimpleDocument>) {
    super(doc || createHTMLDocument());
  }

  // override to prevent usage of `this.document` until after the constructor
  protected setupUselessElement() {}

  insertHTMLBefore(parent: SimpleElement, reference: Option<SimpleNode>, html: string): Bounds {
    let raw = this.document.createRawHTMLSection!(html);
    parent.insertBefore(raw, reference);
    return new ConcreteBounds(parent, raw, raw);
  }

  // override to avoid SVG detection/work when in node (this is not needed in SSR)
  createElement(tag: string) {
    return this.document.createElement(tag);
  }

  // override to avoid namespace shenanigans when in node (this is not needed in SSR)
  setAttribute(element: SimpleElement, name: string, value: string) {
    element.setAttribute(name, value);
  }
}
