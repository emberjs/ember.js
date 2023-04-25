import Ember from 'ember';

const pending = 0;

declare const MyDb: {
  hasPendingTransactions(): boolean;
};

if (Ember.Test) {
  Ember.Test.registerWaiter(() => pending !== 0);

  Ember.Test.registerWaiter(MyDb, MyDb.hasPendingTransactions);

  Ember.Test.promise((resolve) => {
    window.setTimeout(resolve, 500);
  });

  Ember.Test.registerHelper('boot', (app) => {
    Ember.run(app, app.advanceReadiness);
  });

  Ember.Test.registerAsyncHelper('boot', (app) => {
    Ember.run(app, app.advanceReadiness);
  });

  Ember.Test.registerAsyncHelper('waitForPromise', (app, promise) => {
    if (!Ember.Test) {
      return;
    }

    return new Ember.Test.Promise((resolve) => {
      if (!Ember.Test) {
        return;
      }
      Ember.Test.Adapter.asyncStart();

      promise.then(() => {
        if (!Ember.Test) {
          return;
        }

        Ember.Test.Adapter.asyncEnd();
      });
    });
  });
}
