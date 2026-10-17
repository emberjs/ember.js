import type {
  Maybe,
  Nullable,
  SerializableElement,
  SerializableNode,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';
import { INSERT_AFTER_BEGIN } from '@glimmer/constants';
import { isSimpleElement } from '@glimmer/debug-util';
import { clearElement } from '@glimmer/util';
import Serializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';

export function toInnerHTML(parent: SimpleElement | SimpleDocumentFragment): string {
  const serializer = new Serializer(voidMap);
  return serializer.serializeChildren(parent);
}

export function toOuterHTML(parent: SimpleElement | SimpleDocumentFragment): string {
  const serializer = new Serializer(voidMap);
  return serializer.serialize(parent);
}

export function getElementByClassName(
  element: SimpleElement,
  className: string
): Nullable<SimpleElement> {
  let current = firstElementChild(element);

  while (current) {
    if (classList(current).indexOf(className) > -1) {
      return current;
    } else {
      const recurse = getElementByClassName(current, className);

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
  const tag = tagName.toUpperCase();
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
  const attr = element.getAttribute('class');
  if (attr === null) return [];
  return attr.split(/\s+/u);
}

export function toTextContent(parent: SimpleElement): string {
  return new TextSerializer(voidMap).serializeChildren(parent);
}

export function replaceHTML(parent: SimpleElement, value: string): void {
  clearElement(parent);
  parent.insertAdjacentHTML(INSERT_AFTER_BEGIN, value);
}

export function assertingElement(node: Maybe<SimpleNode>): SimpleElement {
  if (!isSimpleElement(node)) {
    throw new Error(`Expected element, got ${node?.constructor.name}`);
  }

  return node;
}

export function hasAttribute(parent: SimpleElement, attr: string): boolean {
  return Array.from(parent.attributes).some((parentAttr) => parentAttr.name === attr);
}

export function firstElementChild(parent: SimpleElement): Nullable<SimpleElement> {
  let current = parent.firstChild;

  while (current) {
    if (isSimpleElement(current)) {
      return current;
    }
    current = current.nextSibling;
  }

  return null;
}

export function nextElementSibling(node: SimpleNode): Nullable<SimpleElement> {
  let current = node.nextSibling;

  while (current) {
    if (isSimpleElement(current)) {
      return current;
    }
    current = current.nextSibling;
  }

  return null;
}

class TextSerializer extends Serializer {
  override openTag(_element: SerializableElement) {
    return '';
  }

  override closeTag(_element: SerializableElement) {
    return '';
  }

  override text(text: SerializableNode) {
    return text.nodeValue || '';
  }

  override comment(_comment: SerializableNode) {
    return '';
  }

  override rawHTMLSection(_content: SerializableNode): never {
    throw new Error('Unexpected raw HTML section in serialized text');
  }
}
