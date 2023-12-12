import { registerWaiter, registerHelper, registerAsyncHelper } from '@ember/test';
import TestAdapter from '@ember/test/adapter';
import { expectTypeOf } from 'expect-type';

const pending = 0;
registerWaiter(() => pending !== 0);

declare const MyDb: {
  hasPendingTransactions(): boolean;
};

registerWaiter(MyDb, MyDb.hasPendingTransactions);
// @ts-expect-error
registerWaiter();

registerHelper('boot', (app) => {
  expectTypeOf(app.advanceReadiness()).toBeVoid();
  expectTypeOf(app.deferReadiness()).toBeVoid();
  expectTypeOf(app.register('foo:bar', class {})).toBeVoid();
  // @ts-expect-error
  app.register('foo');
  // @ts-expect-error
  app.register();
});

registerAsyncHelper('boot', (app) => {
  app.advanceReadiness();
  app.deferReadiness();
  app.register('foo', class {});
});

registerAsyncHelper('waitForPromise', (app, promise) => {
  app.advanceReadiness();
  app.deferReadiness();
  app.register('foo', class {});
  return new Promise(() => {
    // This needs a cast to itself, weird though that looks, because it is
    // defined `EmberObject.extend()` not `class extends EmberObject`, and our
    // types for `.extend` do not produce new classes (as described in the RFC
    // for official TS support). Unfortunately, the "zebra-striping" problem,
    // where doing `SomeNativeClass.extend()` can have weird behaviors in some
    // edge cases, means that changing `TestAdapter` to use a native class would
    // technically be a breaking change. Once the entire framework switches to
    // native classes end to end, this cast will be unnecessary.
    const adapter = new TestAdapter() as TestAdapter;
    adapter.asyncStart();
    return promise.then(() => {
      adapter.asyncEnd();
    });
  });
});
