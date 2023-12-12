import { get } from '@ember/object';

import { expectTypeOf } from 'expect-type';

const foo = { baz: 1 };

// We can infer basic types
expectTypeOf(get(foo, 'baz')).toEqualTypeOf<number>();

// We can get unknown properties
expectTypeOf(get(foo, 'missing')).toEqualTypeOf<unknown>();
