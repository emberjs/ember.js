import { compare } from '@ember/utils';
import { expectTypeOf } from 'expect-type';

expectTypeOf(compare('hello', 'hello')).toEqualTypeOf<-1 | 0 | 1>(); // 0
compare('abc', 'dfg'); // -1
compare(2, 1); // 1
// @ts-expect-error -- cannot compare different types!
compare('hello', 50); // 1
// @ts-expect-error -- cannot compare different types!
compare(50, 'hello'); // -1
