import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { VersionedPathReference } from '@glimmer/reference';
import {
  Tag
} from '@glimmer/validator';
import { VMArguments as Arguments, VM, Helper } from '@glimmer/interfaces';

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

  helper = (_vm: VM, args: Arguments) =>
    new ComponentAssertionReference(args.positional.at(0), args.positional.at(1).value() as string);
} else {
  helper = (_vm: VM, args: Arguments) => args.positional.at(0);
}

export default helper;
