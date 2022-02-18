import { isBlank } from '@ember/utils';
import { expectTypeOf } from 'expect-type';

expectTypeOf(isBlank(null)).toEqualTypeOf<boolean>(); // true

isBlank(undefined); // true
isBlank(''); // true
isBlank([]); // true
isBlank('\n\t'); // true
isBlank('  '); // true
isBlank({}); // false
isBlank('\n\t Hello'); // false
isBlank('Hello world'); // false
isBlank([1, 2, 3]); // false

// @ts-expect-error requires an argument
isBlank();
