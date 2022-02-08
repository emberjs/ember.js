import { isPresent } from '@ember/utils';
import { expectTypeOf } from 'expect-type';

expectTypeOf(isPresent(null)).toEqualTypeOf<boolean>(); // false

isPresent(undefined); // false
isPresent(''); // false
isPresent('  '); // false
isPresent('\n\t'); // false
isPresent([]); // false
isPresent({ length: 0 }); // false
isPresent(false); // true
isPresent(true); // true
isPresent('string'); // true
isPresent(0); // true
isPresent(function () {}); // true
isPresent({}); // true
isPresent('\n\t Hello'); // true
isPresent([1, 2, 3]); // true

// It functions as a type guard
let foo: string | null | undefined;
if (isPresent(foo)) {
  expectTypeOf(foo).toEqualTypeOf<string>();
}

// @ts-expect-error it requires an argument
isPresent(); // false
