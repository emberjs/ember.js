import * as SimpleDOM from 'simple-dom';
import { ConcreteBounds } from 'glimmer-runtime/lib/bounds';
import { DOMTreeConstruction } from 'glimmer-runtime';

export default class NodeDOMChanges extends DOMTreeConstruction {
  constructor() {
    super(new SimpleDOM.Document());
  }

  insertHTMLBefore(parent: Element, nextSibling: Node, html: string): Bounds {
    let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;

    let raw = this.document.createRawHTMLSection(html);
    parent.insertBefore(raw, nextSibling);

    let first = prev ? prev.nextSibling : parent.firstChild;
    let last = nextSibling ? nextSibling.previousSibling : parent.lastChild;

    return new ConcreteBounds(parent, first, last);
  }
}
