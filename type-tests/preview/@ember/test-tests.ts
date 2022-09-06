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
  expectTypeOf(app.register('foo', class {})).toBeVoid();
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
    const adapter = new TestAdapter();
    adapter.asyncStart();
    return promise.then(() => {
      adapter.asyncEnd();
    });
  });
});
