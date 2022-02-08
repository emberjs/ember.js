import { isEmpty } from '@ember/utils';
import { expectTypeOf } from 'expect-type';

expectTypeOf(isEmpty(null)).toEqualTypeOf<boolean>(); // true

isEmpty(undefined); // true
isEmpty(''); // true
isEmpty([]); // true
isEmpty({ size: 0 }); // true
isEmpty({}); // false
isEmpty('Adam Hawkins'); // false
isEmpty([0, 1, 2]); // false
isEmpty('\n\t'); // false
isEmpty('  '); // false
isEmpty({ size: 1 }); // false
isEmpty({ size: () => 0 }); // false

// @ts-expect-error requires an argument
isEmpty();
