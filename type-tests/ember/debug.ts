import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

const {
  runInDebug,
  warn,
  debug,
  Debug: { registerDeprecationHandler, registerWarnHandler },
} = Ember;

// Workaround for https://github.com/microsoft/TypeScript/issues/36931.
const assert: typeof Ember.assert = Ember.assert;

/**
 * @ember/debug tests
 */
// @ts-expect-error
runInDebug();
expectTypeOf(runInDebug(() => console.log('Should not show up in prod'))).toBeVoid();

// Log a warning if we have more than 3 tomsters
const tomsterCount = 2;
warn('Too many tomsters!');
expectTypeOf(warn('Too many tomsters!', { id: 'some-warning' })).toBeVoid();
warn('Too many tomsters!', tomsterCount <= 3);
expectTypeOf(warn('Too many tomsters!', tomsterCount <= 3, { id: 'some-warning' })).toBeVoid();
expectTypeOf(
  warn('Too many tomsters!', tomsterCount <= 3, {
    id: 'ember-debug.too-many-tomsters',
  })
).toBeVoid();

// @ts-expect-error
debug();
expectTypeOf(debug('Too many tomsters!')).toBeVoid();
// @ts-expect-error
debug('Too many tomsters!', 'foo');

// next is not called, so no warnings get the default behavior
// @ts-expect-error
registerWarnHandler();
expectTypeOf(registerWarnHandler(() => {})).toBeVoid();
expectTypeOf(
  registerWarnHandler((message, options, next) => {
    expectTypeOf(message).toEqualTypeOf<string>();
    expectTypeOf(options).toEqualTypeOf<{ id: string } | undefined>();
    expectTypeOf(next).toEqualTypeOf<
      (message: string, options?: { id: string } | undefined) => void
    >();
  })
).toBeVoid();
expectTypeOf(
  registerWarnHandler((message, options, next) => {
    expectTypeOf(message).toEqualTypeOf<string>();
    expectTypeOf(options).toEqualTypeOf<{ id: string } | undefined>();
    // @ts-expect-error
    next();
  })
).toBeVoid();
expectTypeOf(
  registerWarnHandler((message, options, next) => {
    expectTypeOf(message).toEqualTypeOf<string>();
    expectTypeOf(options).toEqualTypeOf<{ id: string } | undefined>();
    expectTypeOf(next(message)).toBeVoid();
  })
).toBeVoid();
expectTypeOf(
  registerWarnHandler((message, options, next) => {
    expectTypeOf(message).toEqualTypeOf<string>();
    expectTypeOf(options).toEqualTypeOf<{ id: string } | undefined>();
    expectTypeOf(next(message, options)).toBeVoid();
  })
).toBeVoid();

type ExpectedOptions = {
  id: string;
  until: string;
  url?: string;
  for: string;
  since: { available: string } | { available: string; enabled: string };
};

// next is not called, so no warnings get the default behavior
// @ts-expect-error
registerDeprecationHandler();
expectTypeOf(registerDeprecationHandler(() => {})).toBeVoid();
expectTypeOf(
  registerDeprecationHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<ExpectedOptions | undefined>();
    expectTypeOf(next).toEqualTypeOf<
      (message: string, options?: ExpectedOptions | undefined) => void
    >();
  })
).toBeVoid();
expectTypeOf(
  registerDeprecationHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<ExpectedOptions | undefined>();
    // @ts-expect-error
    next();
  })
).toBeVoid();
expectTypeOf(
  registerDeprecationHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<ExpectedOptions | undefined>();
    expectTypeOf(next(message)).toBeVoid();
  })
).toBeVoid();
expectTypeOf(
  registerDeprecationHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<ExpectedOptions | undefined>();
    expectTypeOf(next(message, options)).toBeVoid();
  })
).toBeVoid();

// Test for truthiness
const str: unknown = 'hello';
assert('Must pass a string', typeof str === 'string');
expectTypeOf(str).toBeString();

// Fail unconditionally
// This has to be last because `assert never` will raise TS's checks for
// unreachable code.
expectTypeOf(assert('This code path should never be run')).toBeNever();
