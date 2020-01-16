import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Helper, VMArguments } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { Tag } from '@glimmer/validator';

let helper: Helper;

if (DEBUG) {
  class ComponentAssertionReference implements VersionedPathReference<unknown> {
    public tag: Tag;

    constructor(private component: VersionedPathReference<unknown>, private message: string) {
      this.tag = component.tag;
    }

    value(): unknown {
      let value = this.component.value();

      assert(this.message, typeof value !== 'string');

      return value;
    }

    get(property: string): VersionedPathReference<unknown> {
      return this.component.get(property);
    }
  }

  helper = (args: VMArguments) =>
    new ComponentAssertionReference(args.positional.at(0), args.positional.at(1).value() as string);
} else {
  helper = (args: VMArguments) => args.positional.at(0);
}

export default helper;
