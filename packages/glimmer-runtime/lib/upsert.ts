import { Opaque } from 'glimmer-util';
import { DOMHelper } from './dom/helper';
import { Bounds, Cursor, SingleNodeBounds, clear } from './bounds';

export interface SafeString {
  toHTML(): string;
}

export function isSafeString(value: Opaque): value is SafeString {
  return value && typeof value['toHTML'] === 'function';
}

export function isNode(value: Opaque): value is Node {
  return value !== null && typeof value === 'object' && typeof value['nodeType'] === 'number';
}

export function isString(value: Opaque): value is string {
  return typeof value === 'string';
}

export type Insertion = CautiousInsertion | TrustingInsertion;
export type CautiousInsertion = string | SafeString | Node;
export type TrustingInsertion = string | Node;

abstract class Upsert {
  constructor(public bounds: Bounds) {
  }

  abstract update(dom: DOMHelper, value: Insertion): boolean;
}

export default Upsert;

export function cautiousInsert(dom: DOMHelper, cursor: Cursor, value: CautiousInsertion): Upsert {
  if (isString(value)) {
    return TextUpsert.insert(dom, cursor, value);
  }
  if (isSafeString(value)) {
    return SafeStringUpsert.insert(dom, cursor, value);
  }
  if (isNode(value)) {
    return NodeUpsert.insert(dom, cursor, value);
  }
}

export function trustingInsert(dom: DOMHelper, cursor: Cursor, value: TrustingInsertion): Upsert {
  if (isString(value)) {
    return HTMLUpsert.insert(dom, cursor, value);
  }
  if (isNode(value)) {
    return NodeUpsert.insert(dom, cursor, value);
  }
}

class TextUpsert extends Upsert {
  static insert(dom: DOMHelper, cursor: Cursor, value: string): Upsert {
    let textNode = dom.insertTextBefore(cursor.element, cursor.nextSibling, value);
    let bounds = new SingleNodeBounds(cursor.element, textNode);
    return new TextUpsert(bounds, textNode);
  }

  constructor(bounds: Bounds, private textNode: Text) {
    super(bounds);
  }

  update(dom: DOMHelper, value: Insertion): boolean {
    if (isString(value)) {
      let { textNode } = this;
      textNode.nodeValue = value;
      return true;
    } else {
      return false;
    }
  }
}

class HTMLUpsert extends Upsert {
  static insert(dom: DOMHelper, cursor: Cursor, value: string): Upsert {
    let bounds = dom.insertHTMLBefore(cursor.element, cursor.nextSibling, value);
    return new HTMLUpsert(bounds);
  }

  update(dom: DOMHelper, value: Insertion): boolean {
    if (isString(value)) {
      let { bounds } = this;

      let parentElement = bounds.parentElement();
      let nextSibling = clear(bounds);

      this.bounds = dom.insertHTMLBefore(parentElement, nextSibling, value);

      return true;
    } else {
      return false;
    }
  }
}

class SafeStringUpsert extends Upsert {
  static insert(dom: DOMHelper, cursor: Cursor, value: SafeString): Upsert {
    let stringValue = value.toHTML();
    let bounds = dom.insertHTMLBefore(cursor.element, cursor.nextSibling, stringValue);
    return new SafeStringUpsert(bounds, stringValue);
  }

  constructor(bounds: Bounds, private lastStringValue: string) {
    super(bounds);
  }

  update(dom: DOMHelper, value: Insertion): boolean {
    if (isSafeString(value)) {
      let stringValue = value.toHTML();

      if (stringValue !== this.lastStringValue) {
        let { bounds } = this;

        let parentElement = bounds.parentElement();
        let nextSibling = clear(bounds);

        this.bounds = dom.insertHTMLBefore(parentElement, nextSibling, stringValue);
        this.lastStringValue = stringValue;
      }

      return true;
    } else {
      return false;
    }
  }
}

class NodeUpsert extends Upsert {
  static insert(dom: DOMHelper, cursor: Cursor, node: Node): Upsert {
    let bounds = dom.insertNodeBefore(cursor.element, node, cursor.nextSibling);
    return new NodeUpsert(bounds);
  }

  update(dom: DOMHelper, value: Insertion): boolean {
    if (isNode(value)) {
      let { bounds } = this;

      let parentElement = bounds.parentElement();
      let nextSibling = clear(bounds);

      this.bounds = dom.insertNodeBefore(parentElement, value, nextSibling);

      return true;
    } else {
      return false;
    }
  }
}
