import { isEmpty, isString } from '../../dom/normalize';
import { Opaque, Simple } from "@glimmer/interfaces";

export default class DynamicTextContent {
  constructor(public node: Simple.Text, private lastValue: string) {
  }

  update(value: Opaque): void {
    let { lastValue } = this;

    if (value === lastValue) return;

    let normalized: string;

    if (isEmpty(value)) {
      normalized = '';
    } else if (isString(value)) {
      normalized = value;
    } else {
      normalized = String(value);
    }

    if (normalized !== lastValue) {
      let textNode = this.node;
      textNode.nodeValue = this.lastValue = normalized;
    }
  }
}
