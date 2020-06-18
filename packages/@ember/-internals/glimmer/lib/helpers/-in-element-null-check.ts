import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Helper, VMArguments } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { Tag } from '@glimmer/validator';

let helper: Helper;

if (DEBUG) {
  class InElementNullCheckReference implements VersionedPathReference {
    public tag: Tag;

    constructor(private inner: VersionedPathReference) {
      this.tag = inner.tag;
    }

    value(): unknown {
      let value = this.inner.value();

      assert(
        'You cannot pass a null or undefined destination element to in-element',
        value !== null && value !== undefined
      );

      return value;
    }

    get(key: string): VersionedPathReference {
      return this.inner.get(key);
    }
  }

  helper = (args: VMArguments) => new InElementNullCheckReference(args.positional.at(0));
} else {
  helper = (args: VMArguments) => args.positional.at(0);
}

export default helper;
