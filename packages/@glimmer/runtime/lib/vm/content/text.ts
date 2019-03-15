import { isEmpty, isString } from '../../dom/normalize';
import { UpdatingOpcode } from '../../opcodes';
import { Tag, VersionedReference } from '@glimmer/reference';
import { SimpleText } from '@simple-dom/interface';

export default class DynamicTextContent extends UpdatingOpcode {
  public type = 'dynamic-text';

  public tag: Tag;
  public lastRevision: number;

  constructor(
    public node: SimpleText,
    private reference: VersionedReference<unknown>,
    private lastValue: string
  ) {
    super();
    this.tag = reference.tag;
    this.lastRevision = this.tag.value();
  }

  evaluate() {
    let { reference, tag } = this;

    if (!tag.validate(this.lastRevision)) {
      this.lastRevision = tag.value();
      this.update(reference.value());
    }
  }

  update(value: unknown): void {
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
