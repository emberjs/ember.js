import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Helper, VMArguments } from '@glimmer/interfaces';
import { PathReference } from '@glimmer/reference';

let helper: Helper;

if (DEBUG) {
  class ComponentAssertionReference implements PathReference<unknown> {
    constructor(private component: PathReference<unknown>, private message: string) {}

    isConst() {
      return this.component.isConst();
    }

    value(): unknown {
      let value = this.component.value();

      assert(this.message, typeof value !== 'string');

      return value;
    }

    get(property: string): PathReference<unknown> {
      return this.component.get(property);
    }
  }

  helper = (args: VMArguments) =>
    new ComponentAssertionReference(args.positional.at(0), args.positional.at(1).value() as string);
} else {
  helper = (args: VMArguments) => args.positional.at(0);
}

export default helper;
