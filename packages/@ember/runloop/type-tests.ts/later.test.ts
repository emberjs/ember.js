import { later, Timer } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

class Foo {
  test(_foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  }
}

let foo = new Foo();

// With only function
expectTypeOf(
  later(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    undefined,
    1
  )
).toEqualTypeOf<Timer>();

expectTypeOf(
  later(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    'string',
    1
  )
).toEqualTypeOf<Timer>();

later((_foo: number): number => {
  return 1;
  // @ts-expect-error invalid argument
}, 'string');

// With target and function
expectTypeOf(
  later(
    foo,
    function (_foo: number, _bar: boolean, _baz?: string): number {
      expectTypeOf(this).toEqualTypeOf<Foo>();
      return 1;
    },
    1,
    true,
    undefined,
    1
  )
).toEqualTypeOf<Timer>();

expectTypeOf(
  later(
    foo,
    function (_foo: number, _bar: boolean, _baz?: string): number {
      return 1;
    },
    1,
    true,
    'string',
    1
  )
).toEqualTypeOf<Timer>();

// @ts-expect-error invalid args
later(
  foo,
  function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  },
  1,
  'string',
  true,
  1
);

// With function string reference
expectTypeOf(later(foo, 'test', 1, true, 'string', 1)).toEqualTypeOf<Timer>();

expectTypeOf(later(foo, 'test', 1, true, undefined, 1)).toEqualTypeOf<Timer>();

// @ts-expect-error Invalid args
later(foo, 'test', 'string');
