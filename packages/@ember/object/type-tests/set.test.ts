import { set } from '@ember/object';

import { expectTypeOf } from 'expect-type';

const foo = { baz: 1 };

expectTypeOf(set(foo, 'baz', 2)).toEqualTypeOf<number>();

// FIXME: This is definitely a potential footgun. You're allowed to
// change the type without any warning.
expectTypeOf(set(foo, 'baz', 'aaaahhh')).toEqualTypeOf<string>();

// We can set unknown properties
expectTypeOf(set(foo, 'missing', true)).toEqualTypeOf<boolean>();
