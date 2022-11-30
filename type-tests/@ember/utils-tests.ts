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
  expectTypeOf(typeOf(null)).toEqualTypeOf<'null'>();
  expectTypeOf(typeOf(undefined)).toEqualTypeOf<'undefined'>();
  expectTypeOf(typeOf('michael')).toEqualTypeOf<'string'>();
  expectTypeOf(typeOf(new String('michael'))).toEqualTypeOf<'string'>();
  expectTypeOf(typeOf(101)).toEqualTypeOf<'number'>();
  expectTypeOf(typeOf(new Number(101))).toEqualTypeOf<'number'>();
  expectTypeOf(typeOf(true)).toEqualTypeOf<'boolean'>();
  expectTypeOf(typeOf(new Boolean(true))).toEqualTypeOf<'boolean'>();
  expectTypeOf(typeOf(() => 4)).toEqualTypeOf<'function'>();
  expectTypeOf(typeOf([1, 2, 90])).toEqualTypeOf<'array'>();
  expectTypeOf(typeOf(/abc/)).toEqualTypeOf<'regexp'>();
  expectTypeOf(typeOf(new Date())).toEqualTypeOf<'date'>();
  expectTypeOf(typeOf(new FileList())).toEqualTypeOf<'filelist'>();
  expectTypeOf(typeOf(EmberObject.extend())).toEqualTypeOf<'class'>();
  expectTypeOf(typeOf(EmberObject.create())).toEqualTypeOf<'instance'>();
  expectTypeOf(typeOf(new Error('teamocil'))).toEqualTypeOf<'error'>();
  expectTypeOf(typeOf({ justAPojo: true })).toEqualTypeOf<'object'>();

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
  expectTypeOf(compare([], class {})).toBeNumber();
  expectTypeOf(compare([], undefined)).toBeNumber();
  expectTypeOf(compare({}, () => 4)).toBeNumber();
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
