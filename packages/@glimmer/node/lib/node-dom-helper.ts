import { DOMTreeConstruction } from '@glimmer/runtime';
import { Simple } from '@glimmer/interfaces';

export default class NodeDOMTreeConstruction extends DOMTreeConstruction {
  protected document!: Simple.Document; // Hides property on base class
  constructor(doc: Simple.Document) {
    super(doc);
  }

  // override to prevent usage of `this.document` until after the constructor
  protected setupUselessElement() {}

  // override to avoid SVG detection/work when in node (this is not needed in SSR)
  createElement(tag: string) {
    return this.document.createElement(tag);
  }

  // override to avoid namespace shenanigans when in node (this is not needed in SSR)
  setAttribute(element: Simple.Element, name: string, value: string) {
    element.setAttribute(name, value);
  }
}
