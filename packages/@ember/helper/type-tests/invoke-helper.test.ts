import Component from '@ember/-internals/glimmer/lib/component';
import { getValue } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import Helper from '@ember/component/helper';
import { invokeHelper } from '@ember/helper';
import { Cache } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';

// NOTE: The types should probably be stricter, but they're from glimmer itself

class PlusOne extends Helper {
  compute([number]: [number]) {
    return number + 1;
  }
}

export default class PlusOneComponent extends Component {
  // Glint would help with this
  declare args: { number: number };

  plusOne = invokeHelper(this, PlusOne, () => {
    return {
      positional: [this.args.number],
    };
  });

  get value() {
    return getValue(this.plusOne);
  }
}

// Good enough for tests!
let owner = {} as Owner;
let component = new PlusOneComponent(owner);

expectTypeOf(component.plusOne).toEqualTypeOf<Cache<unknown>>();
