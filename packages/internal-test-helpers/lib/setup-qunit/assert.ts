import { DEBUG } from '@glimmer/env';

declare global {
  interface Assert {
    rejects<T>(promise: Promise<T>, expected?: string | RegExp, message?: string): Promise<T>;
    rejectsAssertion<T>(
      promise: Promise<T>,
      expected?: string | RegExp,
      message?: string
    ): Promise<T>;
  }

  interface Config {
    urlConfing: (string)[];
  }

  var Ember: {
    onerror: any;
  };
}

export function setupAssert(assert: Assert) {
  assert.rejects = async function(
    promise: Promise<any>,
    expected?: RegExp | string,
    message?: string
  ) {
    let error: Error | undefined;
    let prevOnError = Ember.onerror;
    try {
      Ember.onerror = (e: Error) => {
        error = e;
      };
      try {
        await promise;
      } catch (e) {
        error = e;
      }
    } finally {
      Ember.onerror = prevOnError;
    }
    assert.throws(
      () => {
        if (error) {
          throw error;
        }
      },
      expected,
      message
    );
  };

  assert.rejectsAssertion = async function<T>(
    promise: Promise<T>,
    expected?: string | RegExp,
    message?: string
  ) {
    if (!DEBUG) {
      assert.ok(true, 'Assertions disabled in production builds.');

      return await promise;
    }

    return await assert.rejects(promise, expected, message);
  };
}
