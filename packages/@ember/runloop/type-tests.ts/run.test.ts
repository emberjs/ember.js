import { run } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

class Foo {
  test(_foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  }
}

let foo = new Foo();

// With only function
expectTypeOf(
  run(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    undefined
  )
).toEqualTypeOf<void>();

expectTypeOf(
  run(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    'string'
  )
).toEqualTypeOf<void>();

run((_foo: number): number => {
  return 1;
  // @ts-expect-error invalid argument
}, 'string');

// With target and function
expectTypeOf(
  run(
    foo,
    function (_foo: number, _bar: boolean, _baz?: string): number {
      expectTypeOf(this).toEqualTypeOf<Foo>();
      return 1;
    },
    1,
    true
  )
).toEqualTypeOf<void>();

expectTypeOf(
  run(
    foo,
    function (_foo: number, _bar: boolean, _baz?: string): number {
      return 1;
    },
    1,
    true,
    'string'
  )
).toEqualTypeOf<void>();

// @ts-expect-error invalid args
run(
  foo,
  function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  },
  1,
  'string',
  true
);

// With function string reference
expectTypeOf(run(foo, 'test', 1, true, 'string')).toEqualTypeOf<void>();

expectTypeOf(run(foo, 'test', 1, true)).toEqualTypeOf<void>();

// @ts-expect-error Invalid args
run(foo, 'test', 'string');
