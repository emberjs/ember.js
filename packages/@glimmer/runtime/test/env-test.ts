import { TestEnvironment } from '@glimmer/test-helpers';

QUnit.module('env');

QUnit.test('assert against nested transactions', assert => {
  let env = new TestEnvironment();
  env.begin();
  assert.throws(
    () => env.begin(),
    'A glimmer transaction was begun, but one already exists. You may have a nested transaction, possibly caused by an earlier runtime exception while rendering. Please check your console for the stack trace of any prior exceptions.'
  );
});

QUnit.test('ensure commit cleans up when it can', assert => {
  let env = new TestEnvironment();
  env.begin();

  // ghetto stub
  Object.defineProperty(env, 'transaction', {
    get() {
      return {
        scheduledInstallManagers(): void {},
        commit(): void {
          throw new Error('something failed');
        },
      };
    },
  });

  assert.throws(() => env.commit(), 'something failed'); // commit failed

  // but a previous commit failing, does not cause a future transaction to fail to start
  env.begin();
});
