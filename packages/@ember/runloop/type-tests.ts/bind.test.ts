import { bind } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

class Foo {
  test(_foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  }
}

let foo = new Foo();

// With only function
expectTypeOf(
  bind((_foo: number, _bar: boolean, _baz?: string): number => {
    return 1;
  })
).toEqualTypeOf<(foo: number, bar: boolean, baz?: string) => number | void>();

expectTypeOf(
  bind((_foo: number, _bar: boolean, _baz?: string): number => {
    return 1;
  }, 1)
).toEqualTypeOf<(bar: boolean, baz?: string) => number | void>();

expectTypeOf(
  bind(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true
  )
).toEqualTypeOf<(baz?: string) => number | void>();

expectTypeOf(
  bind(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    'baz'
  )
).toEqualTypeOf<() => number | void>();

expectTypeOf(
  bind(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    undefined
  )
).toEqualTypeOf<() => number | void>();

bind((_foo: number): number => {
  return 1;
  // @ts-expect-error invalid argument
}, 'string');

// With target and function
expectTypeOf(
  bind(foo, function (_foo: number, _bar: boolean, _baz?: string): number {
    expectTypeOf(this).toEqualTypeOf<Foo>();
    return 1;
  })
).toEqualTypeOf<(foo: number, bar: boolean, baz?: string) => number | void>();

expectTypeOf(
  bind(
    foo,
    function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
      return 1;
    },
    1
  )
).toEqualTypeOf<(bar: boolean, baz?: string) => number | void>();

expectTypeOf(
  bind(
    foo,
    function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
      return 1;
    },
    1,
    true
  )
).toEqualTypeOf<(baz?: string) => number | void>();

expectTypeOf(
  bind(
    foo,
    function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
      return 1;
    },
    1,
    true,
    'baz'
  )
).toEqualTypeOf<() => number | void>();

expectTypeOf(
  bind(
    foo,
    function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
      return 1;
    },
    1,
    true,
    undefined
  )
).toEqualTypeOf<() => number | void>();

// @ts-expect-error Invalid args
bind(
  foo,
  function (this: Foo, _foo: number): number {
    return 1;
  },
  'string'
);

// With function string reference
expectTypeOf(bind(foo, 'test')).toEqualTypeOf<
  (foo: number, bar: boolean, baz?: string) => number | void
>();

expectTypeOf(bind(foo, 'test', 1)).toEqualTypeOf<(bar: boolean, baz?: string) => number | void>();

expectTypeOf(bind(foo, 'test', 1, true)).toEqualTypeOf<(baz?: string) => number | void>();

expectTypeOf(bind(foo, 'test', 1, true, 'baz')).toEqualTypeOf<() => number | void>();

expectTypeOf(bind(foo, 'test', 1, true, undefined)).toEqualTypeOf<() => number | void>();

// @ts-expect-error Invalid args
bind(foo, 'test', 'string');
