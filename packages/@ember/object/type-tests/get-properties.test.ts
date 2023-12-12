import { getProperties } from '@ember/object';

import { expectTypeOf } from 'expect-type';

const foo = { baz: 1 };

// We can't correctly infer CP types so just return unknown
expectTypeOf(getProperties(foo, 'baz', 'missing')).toEqualTypeOf<{
  baz: unknown;
  missing: unknown;
}>();

// We can't infer a more specific return without casting the keys
expectTypeOf(getProperties(foo, ['baz', 'missing'])).toMatchTypeOf<{
  [x: string]: unknown;
}>();
expectTypeOf(getProperties(foo, ['baz', 'missing'] as Array<'baz' | 'missing'>)).toEqualTypeOf<{
  baz: unknown;
  missing: unknown;
}>();
