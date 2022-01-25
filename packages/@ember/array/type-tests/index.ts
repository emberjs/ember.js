import EmberArray, { A, NativeArray, isArray, makeArray } from '@ember/array';
import MutableArray from '@ember/array/mutable';

import { expectTypeOf } from 'expect-type';

class Foo {
  bar = 1;
  hi(): string {
    return 'Hi';
  }
  withArgs(foo: number, bar: string): string {
    return `${foo}${bar}`;
  }
}

let foo = new Foo();

let arr = A([foo]);

class Target {
  foo = 2;
}

let target = new Target();

expectTypeOf(arr).toMatchTypeOf<EmberArray<Foo>>();
expectTypeOf(arr).toMatchTypeOf<MutableArray<Foo>>();
expectTypeOf(arr).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(arr.length).toEqualTypeOf<number>();

expectTypeOf(arr.objectAt(1)).toEqualTypeOf<Foo | undefined>();

expectTypeOf(arr.firstObject).toEqualTypeOf<Foo | undefined>();

expectTypeOf(arr.lastObject).toEqualTypeOf<Foo | undefined>();

expectTypeOf(arr.slice()).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(arr.slice(1)).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(arr.slice(1, 2)).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(arr.indexOf(new Foo())).toEqualTypeOf<number>();
// @ts-expect-error checks param type
arr.indexOf('invalid');

expectTypeOf(arr.lastIndexOf(new Foo())).toEqualTypeOf<number>();
// @ts-expect-error checks param type
arr.lastIndexOf('invalid');

expectTypeOf(arr.forEach((item: Foo) => String(item))).toEqualTypeOf(arr);

arr.forEach((item, index, arr) => {
  expectTypeOf(this).toEqualTypeOf<undefined>();
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
});
arr.forEach(function (_item) {
  expectTypeOf(this).toEqualTypeOf(target);
}, target);

expectTypeOf(arr.getEach('bar')).toEqualTypeOf<NativeArray<number>>();
expectTypeOf(arr.getEach('missing')).toEqualTypeOf<NativeArray<unknown>>();

expectTypeOf(arr.setEach('bar', 2)).toEqualTypeOf(arr);
// @ts-expect-error string is not assignable to bar
arr.setEach('bar', 'string');

// Can set unknown property
expectTypeOf(arr.setEach('missing', 'anything')).toEqualTypeOf(arr);

let mapped = arr.map((item, index, arr) => {
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return 1;
});
expectTypeOf(mapped).toEqualTypeOf<NativeArray<number>>();

arr.map(function (_item) {
  expectTypeOf(this).toEqualTypeOf(target);
}, target);

expectTypeOf(arr.mapBy('bar')).toEqualTypeOf<NativeArray<number>>();
expectTypeOf(arr.mapBy('missing')).toEqualTypeOf<NativeArray<unknown>>();

let filtered = arr.filter((item, index, arr) => {
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return true;
});
expectTypeOf(filtered).toEqualTypeOf<NativeArray<Foo>>();
arr.filter(function (_item) {
  expectTypeOf(this).toEqualTypeOf(target);
  return true;
}, target);

let rejected = arr.reject((item, index, arr) => {
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return true;
});
expectTypeOf(rejected).toEqualTypeOf<NativeArray<Foo>>();
arr.reject(function (_item) {
  expectTypeOf(this).toEqualTypeOf(target);
  return true;
}, target);

expectTypeOf(arr.filterBy('bar')).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(arr.filterBy('missing')).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(arr.rejectBy('bar')).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(arr.rejectBy('missing')).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(arr.findBy('bar')).toEqualTypeOf<Foo | undefined>();
arr.findBy('bar', 1);
// @ts-expect-error value has incorrect type
arr.findBy('bar', 'invalid');
arr.findBy('missing', 'whatever');

let isEvery = arr.every((item, index, arr) => {
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return true;
});
expectTypeOf(isEvery).toEqualTypeOf<boolean>();
arr.every(function (_item) {
  expectTypeOf(this).toEqualTypeOf(target);
  return true;
}, target);

expectTypeOf(arr.isEvery('bar')).toEqualTypeOf<boolean>();
arr.isEvery('bar', 1);
// @ts-expect-error value has incorrect type
arr.isEvery('bar', 'invalid');
arr.isEvery('missing', 'whatever');

let isAny = arr.any((item, index, arr) => {
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return true;
});
expectTypeOf(isAny).toEqualTypeOf<boolean>();
arr.any(function (_item) {
  expectTypeOf(this).toEqualTypeOf(target);
  return true;
}, target);

expectTypeOf(arr.isAny('bar')).toEqualTypeOf<boolean>();
arr.isAny('bar', 1);
// @ts-expect-error value has incorrect type
arr.isAny('bar', 'invalid');
arr.isAny('missing', 'whatever');

let reduced = arr.reduce((summation, item, index, arr) => {
  expectTypeOf(summation).toEqualTypeOf<number>();
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return 1;
}, 1);
expectTypeOf(reduced).toEqualTypeOf<number>();
// NOTE: This doesn't match native behavior and is a bit weird
expectTypeOf(arr.reduce((summation, _item) => summation)).toEqualTypeOf<unknown>();

expectTypeOf(arr.invoke('hi')).toEqualTypeOf<NativeArray<string>>();
expectTypeOf(arr.invoke('withArgs', 1, 'two')).toEqualTypeOf<NativeArray<string>>();
// @ts-expect-error Doesn't allow calling with invalid args
arr.invoke('withArgs', 'invalid');
expectTypeOf(arr.invoke('missing')).toEqualTypeOf<NativeArray<unknown>>();
// Currently, args passed to unrecognized methods are ignored
arr.invoke('missing', 'invalid');

expectTypeOf(arr.toArray()).toEqualTypeOf<Foo[]>();

expectTypeOf(arr.compact()).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(A([foo, null]).compact()).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(arr.includes(foo)).toEqualTypeOf<boolean>();
// @ts-expect-error Invalid type
arr.includes(1);

// For some reason this doesn't return a NativeArray
expectTypeOf(arr.sortBy('bar')).toEqualTypeOf<Foo[]>();
// Doesn't enforce keys
expectTypeOf(arr.sortBy('missing')).toEqualTypeOf<Foo[]>();

expectTypeOf(arr.uniq()).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(arr.uniqBy('bar')).toEqualTypeOf<NativeArray<Foo>>();
// Doesn't enforce keys
expectTypeOf(arr.uniqBy('missing')).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(arr.without(foo)).toEqualTypeOf<NativeArray<Foo>>();
// @ts-expect-error invalid type
arr.without(1);

expectTypeOf(isArray(arr)).toEqualTypeOf<boolean>();

expectTypeOf(makeArray(arr)).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(makeArray([foo])).toEqualTypeOf<Foo[]>();
expectTypeOf(makeArray(foo)).toEqualTypeOf<[Foo]>();
expectTypeOf(makeArray(1)).toEqualTypeOf<[number]>();
expectTypeOf(makeArray('string')).toEqualTypeOf<[string]>();
expectTypeOf(makeArray(undefined)).toEqualTypeOf<[]>();
expectTypeOf(makeArray(null)).toEqualTypeOf<[]>();
