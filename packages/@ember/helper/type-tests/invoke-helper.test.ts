import Component from '@glimmer/component';
import { getValue } from '@ember/-internals/metal';
import { invokeHelper } from '@ember/helper';
import type { Cache } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';
import type Owner from '@ember/owner';

// NOTE: The types should probably be stricter, but they're from glimmer itself

function plusOne(number: number) {
  return number + 1;
}

class PlusOneComponent extends Component {
  declare number: number;

  plusOne = invokeHelper(this, plusOne, () => {
    return {
      positional: [this.number],
    };
  });

  get value() {
    return getValue(this.plusOne);
  }
}

let component = new PlusOneComponent({} as Owner, {}) ;

expectTypeOf(component.plusOne).toEqualTypeOf<Cache<unknown>>();
