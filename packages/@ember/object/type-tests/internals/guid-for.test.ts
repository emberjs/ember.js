import { expectTypeOf } from 'expect-type';

import { guidFor } from '@ember/object/-internals';

expectTypeOf(guidFor('foo')).toEqualTypeOf<string>();
expectTypeOf(guidFor(1)).toEqualTypeOf<string>();
expectTypeOf(guidFor({ bar: 1 })).toEqualTypeOf<string>();
expectTypeOf(guidFor(null)).toEqualTypeOf<string>();
expectTypeOf(guidFor(undefined)).toEqualTypeOf<string>();
