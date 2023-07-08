import { expectTypeOf } from 'expect-type';

import { cacheFor } from '@ember/object/-internals';

expectTypeOf(cacheFor).toEqualTypeOf<(obj: object, key: string) => unknown>();

expectTypeOf(cacheFor({ foo: 1 }, 'foo')).toEqualTypeOf<number | undefined>();
expectTypeOf(cacheFor({ foo: 1 }, 'other')).toEqualTypeOf<unknown>();
