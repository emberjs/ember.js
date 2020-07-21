import { isEmpty, isString } from '../../dom/normalize';
import { UpdatingOpcode } from '../../opcodes';
import { Reference, valueForRef } from '@glimmer/reference';
import { SimpleText } from '@simple-dom/interface';

export default class DynamicTextContent extends UpdatingOpcode {
  public type = 'dynamic-text';

  constructor(
    public node: SimpleText,
    private reference: Reference<unknown>,
    private lastValue: string
  ) {
    super();
  }

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
