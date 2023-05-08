import {
  runInDebug,
  warn,
  debug,
  assert,
  registerWarnHandler,
  registerDeprecationHandler,
  deprecate,
} from '@ember/debug';
import { expectTypeOf } from 'expect-type';

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

// Test for truthiness
const str: unknown = 'hello';
expectTypeOf(assert('Must pass a string', typeof str === 'string')).toBeVoid();
assert('Must pass a string', typeof str === 'string');
expectTypeOf(str).toBeString();

const anObject = {};
expectTypeOf(assert('Must pass an object', anObject)).toBeVoid();

// Test with null and undefined
expectTypeOf(assert('Can handle falsiness', null)).toBeVoid();
expectTypeOf(assert('Can handle falsiness', undefined)).toBeVoid();

// next is not called, so no warnings get the default behavior
// @ts-expect-error
registerWarnHandler();
expectTypeOf(registerWarnHandler(() => {})).toBeVoid();
expectTypeOf(
  registerWarnHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<{ id: string } | undefined>();
    expectTypeOf(next).toEqualTypeOf<
      (message: string, options?: { id: string } | undefined) => void
    >();
  })
).toBeVoid();
expectTypeOf(
  registerWarnHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<{ id: string } | undefined>();
    // @ts-expect-error
    next();
  })
).toBeVoid();
expectTypeOf(
  registerWarnHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<{ id: string } | undefined>();
    expectTypeOf(next(message)).toBeVoid();
  })
).toBeVoid();
expectTypeOf(
  registerWarnHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<{ id: string } | undefined>();
    expectTypeOf(next(message, options)).toBeVoid();
  })
).toBeVoid();

type ExpectedDeprecationOptions = {
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
    expectTypeOf(options).toEqualTypeOf<ExpectedDeprecationOptions | undefined>();
    expectTypeOf(next).toEqualTypeOf<
      (message: string, options?: ExpectedDeprecationOptions | undefined) => void
    >();
  })
).toBeVoid();
expectTypeOf(
  registerDeprecationHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<ExpectedDeprecationOptions | undefined>();
    // @ts-expect-error
    next();
  })
).toBeVoid();
expectTypeOf(
  registerDeprecationHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<ExpectedDeprecationOptions | undefined>();
    expectTypeOf(next(message)).toBeVoid();
  })
).toBeVoid();
expectTypeOf(
  registerDeprecationHandler((message, options, next) => {
    expectTypeOf(message).toBeString();
    expectTypeOf(options).toEqualTypeOf<ExpectedDeprecationOptions | undefined>();
    expectTypeOf(next(message, options)).toBeVoid();
  })
).toBeVoid();

// @ts-expect-error
deprecate();
deprecate('missing test and options');
deprecate('missing options', true);
deprecate('missing options', false);
// @ts-expect-error
deprecate('missing options body', true, {});
// @ts-expect-error
deprecate('missing options id', true, { until: 'v4.0.0' });
// @ts-expect-error
deprecate('missing options until', true, { id: 'some.deprecation' });
expectTypeOf(
  deprecate('a valid deprecation without `url`', true, {
    id: 'some.deprecation',
    until: 'v4.0.0',
    for: 'some.namespace',
    since: {
      available: 'some.early.version',
      enabled: 'some.version',
    },
  })
).toBeVoid();
deprecate('incorrect options `url`', true, {
  id: 'some.deprecation',
  until: 'v4.0.0',
  // @ts-expect-error
  url: 123,
  for: 'some.namespace',
  since: {
    available: 'some.earlier.version',
    enabled: 'some.version',
  },
});
expectTypeOf(
  deprecate('a valid deprecation with `url`', true, {
    id: 'some.deprecation',
    until: 'v4.0.0',
    url: 'https://example.com/ember-deprecations-yo',
    for: 'some.namespace',
    since: {
      available: 'some.earlier.version',
      enabled: 'some.version',
    },
  })
).toBeVoid();
expectTypeOf(
  deprecate('a valid deprecation with `for`', true, {
    id: 'some.deprecation',
    until: 'v4.0.0',
    for: 'some.namespace',
    since: {
      available: 'some.earlier.version',
      enabled: 'some.version',
    },
  })
).toBeVoid();
deprecate('incorrect options `for`', true, {
  id: 'some.deprecation',
  until: 'v4.0.0',
  // @ts-expect-error
  for: 123,
  since: {
    available: 'some.earlier.version',
    enabled: 'some.version',
  },
});
expectTypeOf(
  deprecate('a valid deprecation with `since`', true, {
    id: 'some.deprecation',
    until: 'v4.0.0',
    for: 'some.namespace',
    since: {
      available: 'some.version',
    },
  })
).toBeVoid();
expectTypeOf(
  deprecate('a valid deprecation with `since`', true, {
    id: 'some.deprecation',
    until: 'v4.0.0',
    for: 'some.namespace',
    since: {
      available: 'some.version',
      enabled: 'some.version',
    },
  })
).toBeVoid();
deprecate('incorrect options `since`', true, {
  id: 'some.deprecation',
  until: 'v4.0.0',
  for: 'some.namespace',
  // @ts-expect-error
  since: 123,
});
deprecate('incorrect options `since`', true, {
  id: 'some.deprecation',
  until: 'v4.0.0',
  for: 'some.namespace',
  since: {
    // @ts-expect-error
    wrongKey: 'some.version',
  },
});
deprecate('incorrect options `since` available', true, {
  id: 'some.deprecation',
  until: 'v4.0.0',
  for: 'some.namespace',
  since: {
    // @ts-expect-error
    available: 123,
  },
});
deprecate('incorrect options `since` enabled', true, {
  id: 'some.deprecation',
  until: 'v4.0.0',
  for: 'some.namespace',
  since: {
    available: 'some.earlier.version',
    // @ts-expect-error
    enabled: 123,
  },
});
deprecate('incorrect options `since` empty', true, {
  id: 'some.deprecation',
  until: 'v4.0.0',
  for: 'some.namespace',
  // @ts-expect-error
  since: {},
});
deprecate('incorrect options `since` enabled w/o available', true, {
  id: 'some.deprecation',
  until: 'v4.0.0',
  for: 'some.namespace',
  // @ts-expect-error
  since: {
    enabled: 'some.version',
  },
});

// NOTE: these are at the bottom so they don't have the super annoying effect
// of throwing up TS warnings about all the *other* tests above
// Fail unconditionally
expectTypeOf(assert('This code path should never be run')).toBeNever();

// Require first argument
// @ts-expect-error
assert();
