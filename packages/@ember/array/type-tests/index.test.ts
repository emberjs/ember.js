import type { NativeArray } from '@ember/array';
import type EmberArray from '@ember/array';
import { A, isArray, makeArray } from '@ember/array';
import type MutableArray from '@ember/array/mutable';

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

// NativeArray does not exactly extend the interface of EmberArray and MutableArray,
// since native methods are not overwritten.
expectTypeOf(arr).not.toMatchTypeOf<EmberArray<Foo>>();
expectTypeOf(arr).not.toMatchTypeOf<MutableArray<Foo>>();

expectTypeOf(arr).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(arr.length).toEqualTypeOf<number>();

expectTypeOf(arr.objectAt(1)).toEqualTypeOf<Foo | undefined>();

expectTypeOf(arr.firstObject).toEqualTypeOf<Foo | undefined>();

expectTypeOf(arr.lastObject).toEqualTypeOf<Foo | undefined>();

expectTypeOf(arr.slice()).toEqualTypeOf<Foo[]>();
expectTypeOf(arr.slice(1)).toEqualTypeOf<Foo[]>();
expectTypeOf(arr.slice(1, 2)).toEqualTypeOf<Foo[]>();

expectTypeOf(arr.indexOf(new Foo())).toEqualTypeOf<number>();
// @ts-expect-error checks param type
arr.indexOf('invalid');

expectTypeOf(arr.lastIndexOf(new Foo())).toEqualTypeOf<number>();
// @ts-expect-error checks param type
arr.lastIndexOf('invalid');

expectTypeOf(arr.forEach((item: Foo) => String(item))).toEqualTypeOf<void>();

arr.forEach((item, index, arr) => {
  expectTypeOf(this).toEqualTypeOf<undefined>();
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
});
arr.forEach(function (_item) {
  // No-op
}, target);

expectTypeOf(arr.getEach('bar')).toEqualTypeOf<NativeArray<number>>();
// @ts-expect-error Unknown property
arr.getEach('missing');

expectTypeOf(arr.setEach('bar', 2)).toEqualTypeOf(arr);
// @ts-expect-error Invalid value
arr.setEach('bar', 'string');

// @ts-expect-error Unknown property
arr.setEach('missing', 'anything');

let mapped = arr.map((item, index, arr) => {
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return 1;
});
expectTypeOf(mapped).toEqualTypeOf<number[]>();

arr.map(function (_item) {
  return true;
}, target);

expectTypeOf(arr.mapBy('bar')).toEqualTypeOf<NativeArray<number>>();
expectTypeOf(arr.mapBy('missing')).toEqualTypeOf<NativeArray<unknown>>();

let filtered = arr.filter((item, index, arr) => {
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return true;
});
expectTypeOf(filtered).toEqualTypeOf<Foo[]>();
arr.filter(function (_item) {
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
// TODO: Ideally we'd mark the value as being invalid
arr.findBy('bar', 'invalid');
// Allows any value to be passed to an unkown property
expectTypeOf(arr.findBy('missing', 'whatever')).toEqualTypeOf<Foo | undefined>();
expectTypeOf(arr.findBy('bar')).toEqualTypeOf<Foo | undefined>();

let isEvery = arr.every((item, index, arr) => {
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return true;
});
expectTypeOf(isEvery).toEqualTypeOf<boolean>();
arr.every(function (_item) {
  return true;
}, target);

expectTypeOf(arr.isEvery('bar')).toEqualTypeOf<boolean>();
arr.isEvery('bar', 1);
// TODO: Ideally we'd mark the value as being invalid
arr.isEvery('bar', 'invalid');
// Allows any value to be passed to an unknown property
expectTypeOf(arr.isEvery('missing', 'whatever')).toEqualTypeOf<boolean>();

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
// TODO: Ideally we'd mark the value as being invalid
arr.isAny('bar', 'invalid');
// Allows any value to be passed to an unknown property
expectTypeOf(arr.isAny('missing', 'whatever')).toEqualTypeOf<boolean>();

let reduced = arr.reduce((summation, item, index, arr) => {
  expectTypeOf(summation).toEqualTypeOf<number>();
  expectTypeOf(item).toEqualTypeOf<Foo>();
  expectTypeOf(index).toEqualTypeOf<number>();
  expectTypeOf(arr).toEqualTypeOf(arr);
  return 1;
}, 1);
expectTypeOf(reduced).toEqualTypeOf<number>();
expectTypeOf(arr.reduce((summation, _item) => summation)).toEqualTypeOf<Foo>();

expectTypeOf(arr.invoke('hi')).toEqualTypeOf<NativeArray<string>>();
expectTypeOf(arr.invoke('withArgs', 1, 'two')).toEqualTypeOf<NativeArray<string>>();
// @ts-expect-error Doesn't allow calling with invalid args
arr.invoke('withArgs', 'invalid');
// @ts-expect-error Doesn't allow calling with invalid method
arr.invoke('missing');

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

expectTypeOf(arr.pushObjects(arr)).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(arr.pushObjects([foo] as Foo[])).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(arr.pushObjects([foo] as readonly Foo[])).toEqualTypeOf<NativeArray<Foo>>();

expectTypeOf(isArray(arr)).toEqualTypeOf<boolean>();

expectTypeOf(makeArray(arr)).toEqualTypeOf<NativeArray<Foo>>();
expectTypeOf(makeArray([foo])).toEqualTypeOf<Foo[]>();
expectTypeOf(makeArray(foo)).toEqualTypeOf<[Foo]>();
expectTypeOf(makeArray(1)).toEqualTypeOf<[number]>();
expectTypeOf(makeArray('string')).toEqualTypeOf<[string]>();
expectTypeOf(makeArray(undefined)).toEqualTypeOf<[]>();
expectTypeOf(makeArray(null)).toEqualTypeOf<[]>();
