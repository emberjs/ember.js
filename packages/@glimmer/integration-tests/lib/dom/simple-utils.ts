import {
  SimpleElement,
  SimpleDocumentFragment,
  InsertPosition,
  SimpleNode,
  NodeType,
  SerializableElement,
  SerializableNode,
} from '@simple-dom/interface';
import Serializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';
import { Option } from '@glimmer/interfaces';
import { clearElement } from '@glimmer/util';

export function toInnerHTML(parent: SimpleElement | SimpleDocumentFragment): string {
  let serializer = new Serializer(voidMap);
  return serializer.serializeChildren(parent);
}

export function toOuterHTML(parent: SimpleElement | SimpleDocumentFragment): string {
  let serializer = new Serializer(voidMap);
  return serializer.serialize(parent);
}

export function getElementByClassName(
  element: SimpleElement,
  className: string
): Option<SimpleElement> {
  let current = firstElementChild(element);

  while (current) {
    if (classList(current).indexOf(className) > -1) {
      return current;
    } else {
      let recurse = getElementByClassName(current, className);

      if (recurse) return recurse;

      current = nextElementSibling(current);
    }
  }

  return null;
}

export function getElementsByTagName(
  element: SimpleElement,
  tagName: string,
  accum: SimpleElement[] = []
): SimpleElement[] {
  let tag = tagName.toUpperCase();
  let current = firstElementChild(element);

  while (current) {
    if (current.tagName === tag) {
      accum.push(current);
    }

    getElementsByTagName(current, tagName, accum);
    current = nextElementSibling(current);
  }

  return accum;
}

export function classList(element: SimpleElement): string[] {
  let attr = element.getAttribute('class');
  if (attr === null) return [];
  return attr.split(/\s+/);
}

export function toTextContent(parent: SimpleElement): string {
  return new TextSerializer(voidMap).serializeChildren(parent);
}

export function replaceHTML(parent: SimpleElement, value: string): void {
  clearElement(parent);
  parent.insertAdjacentHTML(InsertPosition.afterbegin, value);
}

export function assertElement(node: Option<SimpleNode>): SimpleElement {
  if (!node || node.nodeType !== NodeType.ELEMENT_NODE) {
    throw new Error(`Expected element, got ${node}`);
  }

  return node;
}

export function hasAttribute(parent: SimpleElement, attr: string): boolean {
  let attrs = parent.attributes;

  for (let i = 0; i < attrs.length; i++) {
    if (attrs[i].name === attr) return true;
  }

  return false;
}

export function firstElementChild(parent: SimpleElement): Option<SimpleElement> {
  let current = parent.firstChild;

  while (current) {
    if (current.nodeType === NodeType.ELEMENT_NODE) {
      return current;
    }
    current = current.nextSibling;
  }

  return null;
}

export function nextElementSibling(node: SimpleNode): Option<SimpleElement> {
  let current = node.nextSibling;

  while (current) {
    if (current.nodeType === NodeType.ELEMENT_NODE) {
      return current;
    }
    current = current.nextSibling;
  }

  return null;
}

export function elementId(element: SimpleElement): Option<string> {
  return element.getAttribute('id');
}

class TextSerializer extends Serializer {
  openTag(_element: SerializableElement) {
    return '';
  }

  closeTag(_element: SerializableElement) {
    return '';
  }

  text(text: SerializableNode) {
    return text.nodeValue || '';
  }

  comment(_comment: SerializableNode) {
    return '';
  }

  rawHTMLSection(_content: SerializableNode): never {
    throw new Error('Unexpected raw HTML section in serialized text');
  }
}
