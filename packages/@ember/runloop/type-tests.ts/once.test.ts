import { once, Timer } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

class Foo {
  test(_foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  }
}

let foo = new Foo();

// With only function
expectTypeOf(
  once(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    undefined
  )
).toEqualTypeOf<Timer>();

expectTypeOf(
  once(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    'string'
  )
).toEqualTypeOf<Timer>();

once((_foo: number): number => {
  return 1;
  // @ts-expect-error invalid argument
}, 'string');

// With target and function
expectTypeOf(
  once(
    foo,
    function (_foo: number, _bar: boolean, _baz?: string): number {
      expectTypeOf(this).toEqualTypeOf<Foo>();
      return 1;
    },
    1,
    true
  )
).toEqualTypeOf<Timer>();

expectTypeOf(
  once(
    foo,
    function (_foo: number, _bar: boolean, _baz?: string): number {
      return 1;
    },
    1,
    true,
    'string'
  )
).toEqualTypeOf<Timer>();

// @ts-expect-error invalid args
once(
  foo,
  function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  },
  1,
  'string',
  true
);

// With function string reference
expectTypeOf(once(foo, 'test', 1, true, 'string')).toEqualTypeOf<Timer>();

expectTypeOf(once(foo, 'test', 1, true)).toEqualTypeOf<Timer>();

// @ts-expect-error Invalid args
once(foo, 'test', 'string');
