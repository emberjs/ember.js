import { throttle } from '@ember/runloop';
import { Timer } from 'backburner.js';
import { expectTypeOf } from 'expect-type';

// From Docs

function whoRan() {
  // Do stuff
}

let myContext = { name: 'throttle', test(_foo: number, _baz?: boolean): void {} };

throttle(myContext, whoRan, 150);

// less than 150ms passes
throttle(myContext, whoRan, 150);

throttle(myContext, whoRan, 150, true);

// console logs 'throttle ran.' one time immediately.
// 100ms passes
throttle(myContext, whoRan, 150, true);

// 150ms passes and nothing else is logged to the console and
// the throttlee is no longer being watched
throttle(myContext, whoRan, 150, true);

// console logs 'throttle ran.' one time immediately.
// 150ms passes and nothing else is logged to the console and
// the throttlee is no longer being watched

// Method only
expectTypeOf(throttle((_foo: number, _baz?: boolean): void => {}, 1, undefined, 1)).toEqualTypeOf<
  Timer
>();

// Wait is optional
throttle((_foo: number, _baz?: boolean): void => {}, 1, true);

// @ts-expect-error Requires all args
throttle((_foo: number, _baz?: boolean): void => {}, 1, 1);

// Can set immediate
throttle((_foo: number, _baz?: boolean): void => {}, 1, true, 1, true);

// With target
throttle(
  myContext,
  function (_foo: number, _baz?: boolean): void {
    expectTypeOf(this).toEqualTypeOf(myContext);
  },
  1,
  true,
  1,
  true
);

// With key
throttle(myContext, 'test', 1, true, 1, true);

// @ts-expect-error invalid key
throttle(myContext, 'invalid');

class Foo {
  test(_foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  }
}

let foo = new Foo();

// With only function
expectTypeOf(
  throttle(
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
  throttle(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    'string',
    1
  )
).toEqualTypeOf<Timer>();

throttle((_foo: number): number => {
  return 1;
  // @ts-expect-error invalid argument
}, 'string');

// With target and function
expectTypeOf(
  throttle(
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
  throttle(
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
throttle(
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
expectTypeOf(throttle(foo, 'test', 1, true, 'string', 1)).toEqualTypeOf<Timer>();

expectTypeOf(throttle(foo, 'test', 1, true, undefined, 1)).toEqualTypeOf<Timer>();

// @ts-expect-error Invalid args
throttle(foo, 'test', 'string');
