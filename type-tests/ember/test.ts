import { run } from "@ember/runloop";
import { registerAsyncHelper, registerHelper, registerWaiter } from "@ember/test";
import { asyncEnd, asyncStart } from "ember-testing/lib/test/adapter";
import TestPromise, { promise} from "ember-testing/lib/test/promise";

const pending = 0;

declare const MyDb: {
  hasPendingTransactions(): boolean;
};


registerWaiter(() => pending !== 0);

  registerWaiter(MyDb, MyDb.hasPendingTransactions);

  promise((resolve) => {
    window.setTimeout(resolve, 500);
  });

  registerHelper('boot', (app) => {
    run(app, app.advanceReadiness);
  });

  registerAsyncHelper('boot', (app) => {
    run(app, app.advanceReadiness);
  });

  registerAsyncHelper('waitForPromise', (app, promise) => {
    return new TestPromise((resolve) => {
      asyncStart();

      promise.then(() => {
        asyncEnd();
      });
    });
  });

