import { join } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

class Foo {
  test(_foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  }
}

let foo = new Foo();

// With only function
expectTypeOf(
  join(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true
  )
).toEqualTypeOf<number | void>();

expectTypeOf(
  join(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    'string'
  )
).toEqualTypeOf<number | void>();

join((_foo: number): number => {
  return 1;
  // @ts-expect-error invalid argument
}, 'string');

// With target and function
expectTypeOf(
  join(
    foo,
    function (_foo: number, _bar: boolean, _baz?: string): number {
      expectTypeOf(this).toEqualTypeOf<Foo>();
      return 1;
    },
    1,
    true
  )
).toEqualTypeOf<number | void>();

expectTypeOf(
  join(
    foo,
    function (_foo: number, _bar: boolean, _baz?: string): number {
      return 1;
    },
    1,
    true,
    'string'
  )
).toEqualTypeOf<number | void>();

// @ts-expect-error invalid args
join(
  foo,
  function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  },
  1,
  'string'
);

// With function string reference
expectTypeOf(join(foo, 'test', 1, true)).toEqualTypeOf<number | void>();

expectTypeOf(join(foo, 'test', 1, true, 'string')).toEqualTypeOf<number | void>();

// @ts-expect-error Invalid args
join(foo, 'test', 'string');
