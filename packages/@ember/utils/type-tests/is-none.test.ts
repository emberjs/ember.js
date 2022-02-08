import { isNone } from '@ember/utils';
import { expectTypeOf } from 'expect-type';

expectTypeOf(isNone(null)).toEqualTypeOf<boolean>(); // true
isNone(undefined); // true
isNone(''); // false
isNone([]); // false
isNone(function () {}); // false

// It functions as a type guard
let foo: unknown;
if (isNone(foo)) {
  expectTypeOf(foo).toEqualTypeOf<null | undefined>();
}

// @ts-expect-error argument is required
isNone(); // true
