import { setProperties } from '@ember/object';

import { expectTypeOf } from 'expect-type';

const foo = { baz: 1 };

expectTypeOf(setProperties(foo, { baz: 2, missing: true })).toEqualTypeOf<{
  baz: number;
  missing: boolean;
}>();
