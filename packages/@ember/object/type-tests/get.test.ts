import { get } from '@ember/object';

import { expectTypeOf } from 'expect-type';

let foo = { baz: 1 };

// We can't correctly infer CP types so just return unknown
expectTypeOf(get(foo, 'baz')).toEqualTypeOf<unknown>();

// We can get unknown properties
expectTypeOf(get(foo, 'missing')).toEqualTypeOf<unknown>();
