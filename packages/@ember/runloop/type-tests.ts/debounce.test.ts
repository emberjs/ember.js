import { debounce } from '@ember/runloop';
import { Timer } from 'backburner.js';
import { expectTypeOf } from 'expect-type';

// From Docs

function whoRan() {
  // Do stuff
}

let myContext = { name: 'debounce', test(_foo: number, _baz?: boolean): void {} };

debounce(myContext, whoRan, 150);

// less than 150ms passes
debounce(myContext, whoRan, 150);

debounce(myContext, whoRan, 150, true);

// console logs 'debounce ran.' one time immediately.
// 100ms passes
debounce(myContext, whoRan, 150, true);

// 150ms passes and nothing else is logged to the console and
// the debouncee is no longer being watched
debounce(myContext, whoRan, 150, true);

// console logs 'debounce ran.' one time immediately.
// 150ms passes and nothing else is logged to the console and
// the debouncee is no longer being watched

// Method only
expectTypeOf(debounce((_foo: number, _baz?: boolean): void => {}, 1, undefined, 1)).toEqualTypeOf<
  Timer
>();

// @ts-expect-error Requires wait
debounce((_foo: number, _baz?: boolean): void => {}, 1, true);

// @ts-expect-error Requires all args
debounce((_foo: number, _baz?: boolean): void => {}, 1, 1);

// Can set immediate
debounce((_foo: number, _baz?: boolean): void => {}, 1, true, 1, true);

// With target
debounce(
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
debounce(myContext, 'test', 1, true, 1, true);

// @ts-expect-error invalid key
debounce(myContext, 'invalid');

class Foo {
  test(_foo: number, _bar: boolean, _baz?: string): number {
    return 1;
  }
}

let foo = new Foo();

// With only function
expectTypeOf(
  debounce(
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
  debounce(
    (_foo: number, _bar: boolean, _baz?: string): number => {
      return 1;
    },
    1,
    true,
    'string',
    1
  )
).toEqualTypeOf<Timer>();

debounce((_foo: number): number => {
  return 1;
  // @ts-expect-error invalid argument
}, 'string');

// With target and function
expectTypeOf(
  debounce(
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
  debounce(
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
debounce(
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
expectTypeOf(debounce(foo, 'test', 1, true, 'string', 1)).toEqualTypeOf<Timer>();

expectTypeOf(debounce(foo, 'test', 1, true, undefined, 1)).toEqualTypeOf<Timer>();

// @ts-expect-error Invalid args
debounce(foo, 'test', 'string');
