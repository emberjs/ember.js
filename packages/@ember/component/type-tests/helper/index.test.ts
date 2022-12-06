import type Owner from '@ember/owner';
import type { FrameworkObject } from '@ember/object/-internals';
import Helper from '@ember/component/helper';
import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

// NOTE: The types for `compute` are not actually safe. Glint helps with this.

let helper = new Helper(owner);

expectTypeOf(helper).toMatchTypeOf<FrameworkObject>();

class MyHelper extends Helper {
  compute([cents]: [number], { currency }: { currency: string }) {
    return `${currency}${cents * 0.01}`;
  }
}
new MyHelper(owner);

class NoHash extends Helper {
  compute([cents]: [number]): string {
    return `${cents * 0.01}`;
  }
}
new NoHash(owner);

class NoParams extends Helper {
  compute(): string {
    return 'hello';
  }
}
new NoParams(owner);

class InvalidHelper extends Helper {
  // @ts-expect-error Invalid params
  compute(value: boolean): string {
    return String(value);
  }
}
new InvalidHelper(owner);
