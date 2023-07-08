/* eslint-disable no-new-wrappers */ // we have to test the new-wrappers!
import { expectTypeOf } from 'expect-type';
import EmberObject from '@ember/object';

import { compare, isBlank, isEmpty, isEqual, isNone, isPresent, typeOf } from '@ember/utils';

(function () {
  /** isNone */
  const maybeUndefined: string | undefined = 'not actually undefined';
  if (isNone(maybeUndefined)) {
    return;
  }
  expectTypeOf(maybeUndefined).toBeString();
  // @ts-expect-error
  isNone();
  expectTypeOf(isNone(null)).toEqualTypeOf<boolean>();
  expectTypeOf(isNone(undefined)).toEqualTypeOf<boolean>();
  expectTypeOf(isNone('')).toEqualTypeOf<boolean>();
  expectTypeOf(isNone([])).toEqualTypeOf<boolean>();
  expectTypeOf(isNone(function () {})).toEqualTypeOf<boolean>();
})();

(function () {
  /** isPresent */
  // @ts-expect-error
  isPresent();
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
  expectTypeOf(typeOf(null)).toBeString();
  expectTypeOf(typeOf(undefined)).toBeString();
  expectTypeOf(typeOf('michael')).toBeString();
  expectTypeOf(typeOf(new String('michael'))).toBeString();
  expectTypeOf(typeOf(101)).toBeString();
  expectTypeOf(typeOf(new Number(101))).toBeString();
  expectTypeOf(typeOf(true)).toBeString();
  expectTypeOf(typeOf(new Boolean(true))).toBeString();
  expectTypeOf(typeOf(() => 4)).toBeString();
  expectTypeOf(typeOf([1, 2, 90])).toBeString();
  expectTypeOf(typeOf(/abc/)).toBeString();
  expectTypeOf(typeOf(new Date())).toBeString();
  expectTypeOf(typeOf(new FileList())).toBeString();
  expectTypeOf(typeOf(EmberObject.extend())).toBeString();
  expectTypeOf(typeOf(EmberObject.create())).toBeString();
  expectTypeOf(typeOf(new Error('teamocil'))).toBeString();
  expectTypeOf(typeOf({ justAPojo: true })).toBeString();

  // @ts-expect-error
  typeOf();
  typeOf(null);
  typeOf(undefined);
  typeOf('michael');
  typeOf(new String('michael'));
  typeOf(101);
  typeOf(new Number(101));
  typeOf(true);
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
  expectTypeOf(compare('foo', 'bar')).toBeNumber();
  expectTypeOf(compare(14, 37)).toBeNumber();
  expectTypeOf(compare(class {}, class {})).toBeNumber();
  // @ts-expect-error -- cannot compare different types
  expectTypeOf(compare([], class {})).toBeNumber();
  expectTypeOf(compare([], undefined)).toBeNumber();
  // @ts-expect-error -- cannot compare different types
  expectTypeOf(compare({}, () => 4)).toBeNumber();
  // @ts-expect-error
  compare(14);
  // @ts-expect-error
  compare();
})();

(function () {
  /** isBlank */
  // @ts-expect-error
  isBlank();
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

  // @ts-expect-error
  isEmpty();
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
