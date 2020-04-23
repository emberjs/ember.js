import { getDebugFunction, setDebugFunction } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { setupAssertionHelpers } from './assertion';
import { setupContainersCheck } from './containers';
import { setupDeprecationHelpers } from './deprecation';
import { setupNamespacesCheck } from './namespaces';
import { setupObserversCheck } from './observers';
import { setupRunLoopCheck } from './run-loop';
import { DebugEnv } from './utils';
import { setupWarningHelpers } from './warning';

declare global {
  let Ember: any;

  interface Assert {
    rejects(promise: Promise<any>, expected?: string | RegExp, message?: string): Promise<any>;

    throwsAssertion(block: () => any, expected?: string | RegExp, message?: string): any;
    rejectsAssertion(
      promise: Promise<any>,
      expected?: string | RegExp,
      message?: string
    ): Promise<any>;
  }
}

export default function setupQUnit() {
  let env = {
    getDebugFunction,
    setDebugFunction,
  } as DebugEnv;

  let originalModule = QUnit.module;

  QUnit.module = function(name: string, callback: any) {
    return originalModule(name, function(hooks) {
      setupContainersCheck(hooks);
      setupNamespacesCheck(hooks);
      setupObserversCheck(hooks);
      setupRunLoopCheck(hooks);
      setupAssertionHelpers(hooks, env);
      setupDeprecationHelpers(hooks, env);
      setupWarningHelpers(hooks, env);

      callback(hooks);
    });
  } as typeof QUnit.module;

  QUnit.assert.rejects = async function(
    promise: Promise<any>,
    expected?: RegExp | string,
    message?: string
  ) {
    let error: Error;
    let prevOnError = Ember.onerror;

    Ember.onerror = (e: Error) => {
      error = e;
    };

    try {
      await promise;
    } catch (e) {
      error = e;
    }

    QUnit.assert.throws(
      () => {
        if (error) {
          throw error;
        }
      },
      expected,
      message
    );

    Ember.onerror = prevOnError;
  };

  QUnit.assert.throwsAssertion = function(
    block: () => any,
    expected?: string | RegExp,
    message?: string
  ) {
    if (!DEBUG) {
      QUnit.assert.ok(true, 'Assertions disabled in production builds.');
      return;
    }

    return QUnit.assert.throws(block, expected, message);
  };

  QUnit.assert.rejectsAssertion = async function(
    promise: Promise<any>,
    expected?: string | RegExp,
    message?: string
  ) {
    if (!DEBUG) {
      QUnit.assert.ok(true, 'Assertions disabled in production builds.');

      return promise;
    }

    await QUnit.assert.rejects(promise, expected, message);
  };
}
