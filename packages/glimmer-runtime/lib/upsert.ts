import { Opaque, unreachable } from 'glimmer-util';
import { DOMChanges, DOMTreeConstruction } from './dom/helper';
import * as Simple from './dom/interfaces';
import { FIX_REIFICATION } from './dom/interfaces';
import { Bounds, Cursor, SingleNodeBounds, single, clear } from './bounds';

export interface SafeString {
  toHTML(): string;
}

export function isSafeString(value: Opaque): value is SafeString {
  return !!value && typeof value['toHTML'] === 'function';
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

  abstract update(dom: DOMChanges, value: Insertion): boolean;
}

export default Upsert;

export function cautiousInsert(dom: DOMTreeConstruction, cursor: Cursor, value: CautiousInsertion): Upsert {
  if (isString(value)) {
    return TextUpsert.insert(dom, cursor, value);
  }
  if (isSafeString(value)) {
    return SafeStringUpsert.insert(dom, cursor, value);
  }
  if (isNode(value)) {
    return NodeUpsert.insert(dom, cursor, value);
  }

  throw unreachable();
}

export function trustingInsert(dom: DOMTreeConstruction, cursor: Cursor, value: TrustingInsertion): Upsert {
  if (isString(value)) {
    return HTMLUpsert.insert(dom, cursor, value);
  }
  if (isNode(value)) {
    return NodeUpsert.insert(dom, cursor, value);
  }

  throw unreachable();
}

class TextUpsert extends Upsert {
  static insert(dom: DOMTreeConstruction, cursor: Cursor, value: string): Upsert {
    let textNode = dom.createTextNode(value);
    dom.insertBefore(cursor.element, textNode, cursor.nextSibling);
    let bounds = new SingleNodeBounds(cursor.element, textNode);
    return new TextUpsert(bounds, textNode);
  }

  private textNode: Text;

  constructor(bounds: Bounds, textNode: Simple.Text) {
    super(bounds);
    this.textNode = textNode as Text;
  }

  update(dom: DOMChanges, value: Insertion): boolean {
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
  static insert(dom: DOMTreeConstruction, cursor: Cursor, value: string): Upsert {
    let bounds = dom.insertHTMLBefore(cursor.element, value, cursor.nextSibling);
    return new HTMLUpsert(bounds);
  }

  update(dom: DOMChanges, value: Insertion): boolean {
    if (isString(value)) {
      let { bounds } = this;

      let parentElement = bounds.parentElement();
      let nextSibling = clear(bounds);

      this.bounds = dom.insertHTMLBefore(parentElement as FIX_REIFICATION<Element>, nextSibling as FIX_REIFICATION<Node>, value);

      return true;
    } else {
      return false;
    }
  }
}

class SafeStringUpsert extends Upsert {
  static insert(dom: DOMTreeConstruction, cursor: Cursor, value: SafeString): Upsert {
    let stringValue = value.toHTML();
    let bounds = dom.insertHTMLBefore(cursor.element, stringValue, cursor.nextSibling);
    return new SafeStringUpsert(bounds, stringValue);
  }

  constructor(bounds: Bounds, private lastStringValue: string) {
    super(bounds);
  }

  update(dom: DOMChanges, value: Insertion): boolean {
    if (isSafeString(value)) {
      let stringValue = value.toHTML();

      if (stringValue !== this.lastStringValue) {
        let { bounds } = this;

        let parentElement = bounds.parentElement();
        let nextSibling = clear(bounds);

        this.bounds = dom.insertHTMLBefore(parentElement as FIX_REIFICATION<Element>, nextSibling as FIX_REIFICATION<Node>, stringValue);
        this.lastStringValue = stringValue;
      }

      return true;
    } else {
      return false;
    }
  }
}

class NodeUpsert extends Upsert {
  static insert(dom: DOMTreeConstruction, cursor: Cursor, node: Simple.Node): Upsert {
    dom.insertBefore(cursor.element, node, cursor.nextSibling);
    return new NodeUpsert(single(cursor.element, node));
  }

  update(dom: DOMChanges, value: Insertion): boolean {
    if (isNode(value)) {
      let { bounds } = this;

      let parentElement = bounds.parentElement();
      let nextSibling = clear(bounds);

      this.bounds = dom.insertNodeBefore(parentElement as FIX_REIFICATION<Element>, value, nextSibling as FIX_REIFICATION<Node>);

      return true;
    } else {
      return false;
    }
  }
}
