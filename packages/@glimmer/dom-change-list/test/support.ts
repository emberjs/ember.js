import { type DOMTreeConstruction, type TreeBuilder } from '@glimmer/dom-change-list';
import {
  type Namespace,
  type NodeTokens,
  type Option,
  type PresentArray,
  type SimpleAttr,
  type SimpleDocumentFragment,
  type SimpleElement,
} from '@glimmer/interfaces';
import { COMMENT_NODE, ELEMENT_NODE, NS_SVG, NS_XLINK, TEXT_NODE } from '@glimmer/util';
import Serializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';

export const XLINK = NS_XLINK;

export function toHTML(parent: SimpleElement | SimpleDocumentFragment) {
  const serializer = new Serializer(voidMap);

  return serializer.serializeChildren(parent);
}

export function toHTMLNS(parent: SimpleElement | SimpleDocumentFragment) {
  const serializer = new NamespacedHTMLSerializer(voidMap);

  return serializer.serializeChildren(parent);
}

class NamespacedHTMLSerializer extends Serializer {
  override openTag(element: SimpleElement): string {
    if (element.namespaceURI === NS_SVG) {
      return '<svg:' + element.tagName.toLowerCase() + this.attributes(element.attributes) + '>';
    } else {
      return super.openTag(element);
    }
  }

  override closeTag(element: SimpleElement): string {
    if (element.namespaceURI === NS_SVG) {
      return '</svg:' + element.tagName.toLowerCase() + '>';
    } else {
      return super.closeTag(element);
    }
  }

  override attr(original: SimpleAttr): string {
    let attr: { name: string; value: Option<string>; specified: boolean };
    if (original.namespaceURI === NS_XLINK) {
      attr = {
        name: `xlink:${original.name}`,
        value: original.value,
        specified: original.specified,
      };
    } else {
      attr = original;
    }

    return super.attr(attr as SimpleAttr);
  }
}

export interface ExpectedToken {
  type: 'element' | 'text' | 'comment';
  value: string;
}

export class Builder {
  protected expected: PresentArray<ExpectedToken>;

  constructor(protected tree: DOMTreeConstruction | TreeBuilder) {
    this.expected = [{ type: 'element', value: '<undefined>' }];
  }

  appendTo(parent: SimpleElement | SimpleDocumentFragment) {
    if (parent.nodeType === 1) {
      this.expected[0].value = parent.tagName;
    } else {
      this.expected[0].value = '#document-fragment';
    }
  }

  closeElement() {
    this.tree.closeElement();
  }

  setAttribute(name: string, value: string, namespace?: Namespace) {
    this.tree.setAttribute(name, value, namespace);
  }

  appendText(text: string) {
    const token = this.tree.appendText(text);
    this.expected[token] = { type: 'text', value: text };
  }

  appendComment(text: string) {
    const token = this.tree.appendComment(text);
    this.expected[token] = { type: 'comment', value: text };
  }

  reify(tokens: NodeTokens): { actual: ExpectedToken[]; expected: ExpectedToken[] } {
    const actual: ExpectedToken[] = [];
    const { expected } = this;

    for (let i = 0; i < expected.length; i++) {
      const reified = tokens.reify(i);

      switch (reified.nodeType) {
        case ELEMENT_NODE:
          actual.push({ type: 'element', value: reified.tagName });
          break;
        case TEXT_NODE:
          actual.push({ type: 'text', value: reified.nodeValue });
          break;
        case COMMENT_NODE:
          actual.push({ type: 'comment', value: reified.nodeValue });
          break;
      }
    }

    return { expected, actual };
  }
}
