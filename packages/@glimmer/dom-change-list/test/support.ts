import { Option, NodeTokens } from '@glimmer/interfaces';
import { DOMTreeConstruction, TreeBuilder } from '@glimmer/dom-change-list';
import {
  Namespace,
  AttrNamespace,
  NodeType,
  SimpleElement,
  SimpleDocumentFragment,
  SimpleAttr,
} from '@simple-dom/interface';
import Serializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';

export const SVG = Namespace.SVG;
export const XLINK = Namespace.XLink;

export function toHTML(parent: SimpleElement | SimpleDocumentFragment) {
  let serializer = new Serializer(voidMap);

  return serializer.serializeChildren(parent);
}

export function toHTMLNS(parent: SimpleElement | SimpleDocumentFragment) {
  let serializer = new NamespacedHTMLSerializer(voidMap);

  return serializer.serializeChildren(parent);
}

class NamespacedHTMLSerializer extends Serializer {
  openTag(element: SimpleElement): string {
    if (element.namespaceURI === SVG) {
      return '<svg:' + element.tagName.toLowerCase() + this.attributes(element.attributes) + '>';
    } else {
      return super.openTag(element);
    }
  }

  closeTag(element: SimpleElement): string {
    if (element.namespaceURI === SVG) {
      return '</svg:' + element.tagName.toLowerCase() + '>';
    } else {
      return super.closeTag(element);
    }
  }

  attr(original: SimpleAttr): string {
    let attr: { name: string; value: Option<string>; specified: boolean };
    if (original.namespaceURI === XLINK) {
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
  protected expected: ExpectedToken[] = [];

  constructor(protected tree: DOMTreeConstruction | TreeBuilder) {
    this.expected[0] = { type: 'element', value: '<undefined>' };
  }

  appendTo(parent: SimpleElement | SimpleDocumentFragment) {
    if (parent.nodeType === 1) {
      this.expected[0].value = (parent as SimpleElement).tagName;
    } else {
      this.expected[0].value = '#document-fragment';
    }
  }

  closeElement() {
    this.tree.closeElement();
  }

  setAttribute(name: string, value: string, namespace?: AttrNamespace) {
    this.tree.setAttribute(name, value, namespace);
  }

  appendText(text: string) {
    let token = this.tree.appendText(text);
    this.expected[token] = { type: 'text', value: text };
  }

  appendComment(text: string) {
    let token = this.tree.appendComment(text);
    this.expected[token] = { type: 'comment', value: text };
  }

  reify(tokens: NodeTokens): { actual: ExpectedToken[]; expected: ExpectedToken[] } {
    let actual: ExpectedToken[] = [];
    let { expected } = this;

    for (let i = 0; i < expected.length; i++) {
      let reified = tokens.reify(i);

      switch (reified.nodeType) {
        case NodeType.ELEMENT_NODE:
          actual.push({ type: 'element', value: reified.tagName });
          break;
        case NodeType.TEXT_NODE:
          actual.push({ type: 'text', value: reified.nodeValue! });
          break;
        case NodeType.COMMENT_NODE:
          actual.push({ type: 'comment', value: reified.nodeValue! });
          break;
      }
    }

    return { expected, actual };
  }
}
