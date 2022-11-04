import MutableArray from '@ember/array/mutable';

import { expectTypeOf } from 'expect-type';

class Foo {
  constructor(public name: string) {}
}

let foo = new Foo('test');

let originalArr = [foo];
// This is not really the ideal way to set things up.
MutableArray.apply(originalArr);
let arr = originalArr as unknown as MutableArray<Foo>;

expectTypeOf(arr).toMatchTypeOf<MutableArray<Foo>>();

expectTypeOf(arr.replace(1, 1, [foo])).toEqualTypeOf<void>();
// @ts-expect-error invalid item
arr.replace(1, 1, ['invalid']);

expectTypeOf(arr.clear()).toEqualTypeOf(arr);

expectTypeOf(arr.insertAt(1, foo)).toEqualTypeOf(arr);

// @ts-expect-error invalid item
arr.insertAt(1, 'invalid');

expectTypeOf(arr.removeAt(1, 1)).toEqualTypeOf(arr);

expectTypeOf(arr.pushObject(foo)).toEqualTypeOf(foo);
// @ts-expect-error invalid item
arr.pushObject('invalid');

expectTypeOf(arr.pushObjects([foo])).toEqualTypeOf(arr);
// @ts-expect-error invalid item
arr.pushObjects(['invalid']);

expectTypeOf(arr.popObject()).toEqualTypeOf<Foo | null | undefined>();

expectTypeOf(arr.shiftObject()).toEqualTypeOf<Foo | null | undefined>();

expectTypeOf(arr.unshiftObject(foo)).toEqualTypeOf(foo);
// @ts-expect-error invalid item
arr.unshiftObject('invalid');

expectTypeOf(arr.unshiftObjects([foo])).toEqualTypeOf(arr);
// @ts-expect-error invalid item
arr.unshiftObjects(['invalid']);

expectTypeOf(arr.reverseObjects()).toEqualTypeOf(arr);

expectTypeOf(arr.setObjects([foo])).toEqualTypeOf(arr);
// @ts-expect-error invalid item
arr.setObjects(['invalid']);

expectTypeOf(arr.removeObject(foo)).toEqualTypeOf(arr);
// @ts-expect-error invalid item
arr.removeObject('invalid');

expectTypeOf(arr.addObject(foo)).toEqualTypeOf(arr);
// @ts-expect-error invalid item
arr.addObject('invalid');

expectTypeOf(arr.addObjects([foo])).toEqualTypeOf(arr);
// @ts-expect-error invalid item
arr.addObjects(['invalid']);
