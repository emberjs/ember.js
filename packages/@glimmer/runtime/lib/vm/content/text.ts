import { SimpleText, UpdatingOpcode } from '@glimmer/interfaces';
import { Reference, valueForRef } from '@glimmer/reference';

import { isEmpty, isString } from '../../dom/normalize';

export default class DynamicTextContent implements UpdatingOpcode {
  constructor(
    public node: SimpleText,
    private reference: Reference<unknown>,
    private lastValue: string
  ) {}

  evaluate() {
    let value = valueForRef(this.reference);

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
