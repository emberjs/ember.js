import type { SimpleText, UpdatingOpcode, UpdatingVM } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { valueForRef } from '@glimmer/reference/lib/reference';

import { isEmpty, isString } from '../../dom/normalize';

export default class DynamicTextContent implements UpdatingOpcode {
  constructor(
    public node: SimpleText,
    private reference: Reference,
    private lastValue: string
  ) {}

  evaluate(vm: UpdatingVM) {
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
      vm.dom.setNodeValue(this.node, (this.lastValue = normalized));
    }
  }
}
