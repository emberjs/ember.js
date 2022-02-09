import { schedule, Timer } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

class Foo {
  test(_foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  }
}

let foo = new Foo();

// With only function
expectTypeOf(
  schedule(
    'my-queue',
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    undefined
  )
).toEqualTypeOf<Timer>();

expectTypeOf(
  schedule(
    'my-queue',
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    'string'
  )
).toEqualTypeOf<Timer>();

schedule(
  'my-queue',
  (_foo: number): number => {
    return 1;
  },
  // @ts-expect-error invalid argument
  'string'
);

// With target and function
expectTypeOf(
  schedule(
    'my-queue',
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
  schedule(
    'my-queue',
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
schedule(
  'my-queue',
  foo,
  function (this: Foo, _foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  },
  1,
  'string',
  true
);

// With function string reference
expectTypeOf(schedule('my-queue', foo, 'test', 1, true, 'string')).toEqualTypeOf<Timer>();

expectTypeOf(schedule('my-queue', foo, 'test', 1, true)).toEqualTypeOf<Timer>();

// @ts-expect-error Invalid args
schedule('my-queue', foo, 'test', 'string');
