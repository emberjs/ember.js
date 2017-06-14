import { NewElementBuilder, ElementBuilder } from "./element-builder";

import Bounds, { bounds, currentNode } from '../bounds';
import { Simple } from "@glimmer/interfaces";

export class SerializeBuilder extends NewElementBuilder implements ElementBuilder {
  __appendHTML(html: string): Bounds {
    let first = this.__appendComment('%glimmer%');
    super.__appendHTML(html);
    let last = this.__appendComment('%glimmer%');
    return bounds(this.element, first, last);
  }

  __appendText(string: string): Simple.Text {
    let current = currentNode(this);

    if (current && current.nodeType === Node.TEXT_NODE) {
      this.__appendComment('%sep%');
    }

    return super.__appendText(string);
  }
}
