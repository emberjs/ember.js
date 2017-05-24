import * as SimpleDOM from 'simple-dom';
import { DOMTreeConstruction, Bounds, Simple, ConcreteBounds } from '@glimmer/runtime';

export default class NodeDOMTreeConstruction extends DOMTreeConstruction {
  protected document: SimpleDOM.Document;
  constructor(doc: Simple.Document) {
    super(doc);
  }

  // override to prevent usage of `this.document` until after the constructor
  protected setupUselessElement() { }

  insertHTMLBefore(parent: Simple.Element, reference: Simple.Node, html: string): Bounds {
    let prev = reference ? reference.previousSibling : parent.lastChild;

    let raw = this.document.createRawHTMLSection(html);
    parent.insertBefore(raw, reference);

    let first = prev ? prev.nextSibling : parent.firstChild;
    let last = reference ? reference.previousSibling : parent.lastChild;

    return new ConcreteBounds(parent, first, last);
  }

  // override to avoid SVG detection/work when in node (this is not needed in SSR)
  createElement(tag: string) {
    return this.document.createElement(tag);
  }

  // override to avoid namespace shenanigans when in node (this is not needed in SSR)
  setAttribute(element: Element, name: string, value: string) {
    element.setAttribute(name, value);
  }
}
