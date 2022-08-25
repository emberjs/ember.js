/* eslint-disable no-new-wrappers */ // we have to test the new-wrappers!
import { expectTypeOf } from 'expect-type';

import { compare, isBlank, isEmpty, isEqual, isNone, isPresent, typeOf } from '@ember/utils';

(function () {
  /** isNone */
  const maybeUndefined: string | undefined = 'not actually undefined';
  if (isNone(maybeUndefined)) {
    return;
  }
  const anotherString = maybeUndefined + 'another string';
  expectTypeOf(isNone()).toEqualTypeOf<boolean>();
  expectTypeOf(isNone(null)).toEqualTypeOf<boolean>();
  expectTypeOf(isNone(undefined)).toEqualTypeOf<boolean>();
  expectTypeOf(isNone('')).toEqualTypeOf<boolean>();
  expectTypeOf(isNone([])).toEqualTypeOf<boolean>();
  expectTypeOf(isNone(function () {})).toEqualTypeOf<boolean>();
})();

(function () {
  /** isPresent */
  expectTypeOf(isPresent()).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent(null)).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent(undefined)).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent('')).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent('  ')).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent('\n\t')).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent([])).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent({ length: 0 })).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent(false)).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent(true)).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent('string')).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent(0)).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent(function () {})).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent({})).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent(false)).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent('\n\t Hello')).toEqualTypeOf<boolean>();
  expectTypeOf(isPresent([1, 2, 3])).toEqualTypeOf<boolean>();
})();

(function () {
  /** typeOf */
  typeOf(null); // $ExpectType "null"
  typeOf(undefined); // $ExpectType "undefined"
  typeOf('michael'); // $ExpectType "string"
  // tslint:disable-next-line:no-construct
  typeOf(new String('michael')); // $ExpectType "string"
  typeOf(101); // $ExpectType "number"
  // tslint:disable-next-line:no-construct
  typeOf(new Number(101)); // $ExpectType "number"
  typeOf(true); // $ExpectType "boolean"
  // tslint:disable-next-line:no-construct
  typeOf(new Boolean(true)); // $ExpectType "boolean"
  typeOf(() => 4); // $ExpectType "function"
  typeOf([1, 2, 90]); // $ExpectType "array"
  typeOf(/abc/); // $ExpectType "regexp"
  typeOf(new Date()); // $ExpectType "date"
  typeOf(new FileList()); // $ExpectType "filelist"
  // typeOf(EmberObject.extend());   // $ExpectType "class"
  // typeOf(EmberObject.create());   // $ExpectType "instance"
  typeOf(new Error('teamocil')); // $ExpectType "error"
  typeOf({ justAPojo: true }); // $ExpectType "object"

  typeOf();
  typeOf(null);
  typeOf(undefined);
  typeOf('michael');
  // tslint:disable-next-line:no-construct
  typeOf(new String('michael'));
  typeOf(101);
  // tslint:disable-next-line:no-construct
  typeOf(new Number(101));
  typeOf(true);
  // tslint:disable-next-line:no-construct
  typeOf(new Boolean(true));
  typeOf(() => 4);
  typeOf([1, 2, 90]);
  typeOf(/abc/);
  typeOf(new Date());
  typeOf(FileList);
  typeOf(new Error('teamocil'));
})();

(function () {
  /** isEqual */
  expectTypeOf(isEqual('foo', 'bar')).toEqualTypeOf<boolean>();
  expectTypeOf(isEqual(14, 37)).toEqualTypeOf<boolean>();
  expectTypeOf(isEqual(14, '1')).toEqualTypeOf<boolean>();
  expectTypeOf(
    isEqual(
      () => 4,
      () => 37
    )
  ).toEqualTypeOf<boolean>();
  // @ts-expect-error
  isEqual(14);
  // @ts-expect-error
  isEqual();
})();

(function () {
  /** compare */
  compare('foo', 'bar'); // $ExpectType number
  compare(14, 37); // $ExpectType number
  compare(class {}, class {}); // $ExpectType number
  compare([], class {}); // $ExpectType number
  compare([], undefined); // $ExpectType number
  compare({}, () => 4); // $ExpectType number
  // @ts-expect-error
  compare(14);
  // @ts-expect-error
  compare();
})();

(function () {
  /** isBlank */

  expectTypeOf(isBlank()).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank(null)).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank(undefined)).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank('')).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank([])).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank('\n\t')).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank('  ')).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank({})).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank('\n\t Hello')).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank('Hello world')).toEqualTypeOf<boolean>();
  expectTypeOf(isBlank([1, 2, 3])).toEqualTypeOf<boolean>();
})();

(function () {
  /** isEmpty */

  expectTypeOf(isEmpty()).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty(null)).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty(undefined)).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty('')).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty([])).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty({ size: 0 })).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty({})).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty('Adam Hawkins')).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty([0, 1, 2])).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty('\n\t')).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty('  ')).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty({ size: 1 })).toEqualTypeOf<boolean>();
  expectTypeOf(isEmpty({ size: () => 0 })).toEqualTypeOf<boolean>();
})();
