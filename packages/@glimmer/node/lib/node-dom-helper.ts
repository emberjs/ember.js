import * as SimpleDOM from 'simple-dom';
import { DOMTreeConstruction, Bounds, ConcreteBounds } from '@glimmer/runtime';
import { Simple } from '@glimmer/interfaces';
import { Option } from '@glimmer/util';

export default class NodeDOMTreeConstruction extends DOMTreeConstruction {
  protected document!: SimpleDOM.Document; // Hides property on base class
  constructor(doc: Simple.Document) {
    super(doc);
  }

  // override to prevent usage of `this.document` until after the constructor
  protected setupUselessElement() {}

  insertHTMLBefore(parent: Simple.Element, reference: Option<Simple.Node>, html: string): Bounds {
    let raw = this.document.createRawHTMLSection(html);
    parent.insertBefore(raw, reference);
    return new ConcreteBounds(parent, raw, raw);
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
