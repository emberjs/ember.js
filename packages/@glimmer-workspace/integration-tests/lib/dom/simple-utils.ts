import type {
  Maybe,
  Nullable,
  SerializableElement,
  SerializableNode,
  SimpleComment,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from '@glimmer/interfaces';
import type { COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, DOCUMENT_NODE, TEXT_NODE } from '@glimmer/util';
import { clearElement, ELEMENT_NODE, INSERT_AFTER_BEGIN } from '@glimmer/util';
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

export interface CastToBrowserDom {
  [COMMENT_NODE]: { browser: Comment; simple: SimpleComment };
  [TEXT_NODE]: { browser: Text; simple: SimpleText };
  [DOCUMENT_FRAGMENT_NODE]: { browser: DocumentFragment; simple: SimpleDocumentFragment };
  [DOCUMENT_NODE]: { browser: Document; simple: SimpleDocument };
  [ELEMENT_NODE]: { browser: Element; simple: SimpleElement };
  Node: { browser: Node; simple: SimpleNode };
}

export type CastableSimpleDOM<Type extends CastableNodeType = CastableNodeType> =
  CastToBrowserDom[Type]['simple'];
export type CastableBrowserDom<Type extends CastableNodeType = CastableNodeType> =
  CastToBrowserDom[Type]['browser'];

type NodeTypeFor<C extends CastableSimpleDOM> = C['nodeType'];

export type CastableNodeType = Exclude<keyof CastToBrowserDom, 'Node'>;

export function castToBrowser(node: null): null;
export function castToBrowser<N extends CastableSimpleDOM>(
  node: N
): CastableBrowserDom<NodeTypeFor<N>>;
export function castToBrowser(
  node: SimpleNode,
  nodeType: 'Node'
): CastToBrowserDom['Node']['browser'];
export function castToBrowser<N extends CastableNodeType>(
  node: SimpleNode,
  nodeType: N
): CastableBrowserDom<N>;
export function castToBrowser(
  node: SimpleNode | null,
  nodeType?: CastableNodeType | 'Node'
): CastToBrowserDom[keyof CastToBrowserDom]['browser'] | null {
  if (node === null) {
    return null;
  } else if (nodeType !== undefined) {
    if (node.nodeType === nodeType) {
      return node as unknown as CastableBrowserDom;
    } else {
      throw new Error(`ASSERT: invalid cast to ${nodeType}`);
    }
  } else {
    return node as unknown as CastableBrowserDom;
  }
}

export function castToSimple<Type extends CastableNodeType>(
  node: null,
  nodeType: Type,
  options: { allowNull: true }
): null;
export function castToSimple<Type extends CastableNodeType>(
  node: null | Node | SimpleNode,
  nodeType: Type,
  options: { assertPresent: true }
): CastableSimpleDOM<Type>;
export function castToSimple<Type extends CastableNodeType>(
  node: Node | SimpleNode,
  nodeType: Type
): CastableSimpleDOM<Type>;
export function castToSimple<Type extends CastableNodeType>(
  node: Node | SimpleNode | null,
  nodeType: Type,
  { allowNull, assertPresent }: { allowNull?: true; assertPresent?: true } = {}
): CastableSimpleDOM<Type> | null {
  if (node === null && allowNull) {
    return null;
  } else if (node === null && assertPresent) {
    throw new Error(`unexpected null element passed to castToSimple`);
  } else if (node === null) {
    throw new Error(`unexpected null element passed to castToSimple (add assertNull: true)`);
  } else if (node.nodeType === nodeType) {
    return node as unknown as CastableSimpleDOM<Type>;
  } else {
    throw new Error(`unexpected`);
  }
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
  if (!node || node.nodeType !== ELEMENT_NODE) {
    throw new Error(`Expected element, got ${node}`);
  }

  return node;
}

export function isSimpleElement(node: Maybe<SimpleNode>): node is SimpleElement {
  return !node || node.nodeType !== ELEMENT_NODE;
}

export function assertElement(node: Maybe<SimpleNode>): asserts node is SimpleElement {
  if (!isSimpleElement(node)) {
    throw new Error(`Expected element, got ${node}`);
  }
}

export function hasAttribute(parent: SimpleElement, attr: string): boolean {
  return Array.from(parent.attributes).some((parentAttr) => parentAttr.name === attr);
}

export function firstElementChild(parent: SimpleElement): Nullable<SimpleElement> {
  let current = parent.firstChild;

  while (current) {
    if (current.nodeType === ELEMENT_NODE) {
      return current;
    }
    current = current.nextSibling;
  }

  return null;
}

export function nextElementSibling(node: SimpleNode): Nullable<SimpleElement> {
  let current = node.nextSibling;

  while (current) {
    if (current.nodeType === ELEMENT_NODE) {
      return current;
    }
    current = current.nextSibling;
  }

  return null;
}

export function elementId(element: SimpleElement): Nullable<string> {
  return element.getAttribute('id');
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
