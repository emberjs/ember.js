
import { Simple, Option, NodeTokens } from "@glimmer/interfaces";
import * as SimpleDOM from "simple-dom";
import { DOMTreeConstruction, TreeBuilder } from "@glimmer/dom-change-list";

export const SVG: Simple.Namespace = "http://www.w3.org/2000/svg";
export const XLINK: Simple.Namespace = "http://www.w3.org/1999/xlink";

export function toHTML(parent: Simple.Element | Simple.DocumentFragment) {
  let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

  return serializer.serializeChildren(parent);
}

export function toHTMLNS(parent: Simple.Element | Simple.DocumentFragment) {
  let serializer = new NamespacedHTMLSerializer(SimpleDOM.voidMap);

  return serializer.serializeChildren(parent);
}

class NamespacedHTMLSerializer extends SimpleDOM.HTMLSerializer {
  openTag(element: Simple.Element): string {
    if (element.namespaceURI === SVG) {
      return '<svg:' + element.tagName.toLowerCase() + this.attributes(element.attributes) + '>';
    } else {
      return super.openTag(element);
    }
  }

  closeTag(element: Simple.Element): string {
    if (element.namespaceURI === SVG) {
      return '</svg:' + element.tagName.toLowerCase() + '>';
    } else {
      return super.closeTag(element);
    }
  }

  attr(original: Simple.Attribute): string {
    let attr: { name: string, value: Option<string>, specified: boolean };
    if (original.namespaceURI === XLINK) {
      attr = { name: `xlink:${original.name}`, value: original.value, specified: original.specified };
    } else {
      attr = original;
    }

    return super.attr(attr as Simple.Attribute);
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

  appendTo(parent: Simple.Element | Simple.DocumentFragment) {
    if (parent.nodeType === 1) {
      this.expected[0].value = (parent as Simple.Element).tagName;
    } else {
      this.expected[0].value = '#document-fragment';
    }
  }

  closeElement() {
    this.tree.closeElement();
  }

  setAttribute(name: string, value: string, namespace?: Simple.Namespace) {
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

  reify(tokens: NodeTokens): { actual: ExpectedToken[], expected: ExpectedToken[] } {
    let actual: ExpectedToken[] = [];
    let { expected } = this;

    for (let i=0; i<expected.length; i++) {
      let reified = tokens.reify(i);

      switch(reified.nodeType) {
        case 1:
          actual.push({ type: 'element', value: reified['tagName'] });
          break;
        case 3:
          actual.push({ type: 'text', value: reified.nodeValue! });
          break;
        case 8:
          actual.push({ type: 'comment', value: reified.nodeValue! });
          break;
      }
    }

    return { expected, actual };
  }
}
