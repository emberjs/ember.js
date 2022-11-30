import { assign } from '@ember/polyfills';
import { expectTypeOf } from 'expect-type';

(() => {
  /* assign */
  assign({}, { a: 'b' });
  expectTypeOf(assign({}, { a: 'b' }).a).toBeString();
  expectTypeOf(assign({ a: 6 }, { a: 'b' }).a).toBeString();
  expectTypeOf(assign({ a: 6 }, {}).a).toBeNumber();
  // @ts-expect-error
  assign({ b: 6 }, {}).a;
  expectTypeOf(assign({}, { b: 6 }, {}).b).toBeNumber();
  expectTypeOf(assign({ a: 'hello' }, { b: 6 }, {}).a).toBeString();
  expectTypeOf(assign({ a: 'hello' }, { b: 6 }, { a: true }).a).toBeBoolean();
  // @ts-expect-error
  assign({ a: 'hello' }, '', { a: true }).a;
  expectTypeOf(
    assign({ d: ['gobias industries'] }, { a: 'hello' }, { b: 6 }, { a: true }).d
  ).toEqualTypeOf<string[]>();
  // @ts-expect-error
  assign({}, { a: 0 }, { b: 1 }, { c: 2 }, { d: 3 }).a;

  // matches Object.assign
  expectTypeOf(assign({}, null)).toBeNever();
  expectTypeOf(assign({}, undefined)).toBeNever();
})();
