import { getDebugFunction, setDebugFunction } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { setupAssertionHelpers } from './assertion';
import { setupContainersCheck } from './containers';
import { setupDeprecationHelpers } from './deprecation';
import { setupNamespacesCheck } from './namespaces';
import { setupRunLoopCheck } from './run-loop';
import { DebugEnv } from './utils';
import { setupWarningHelpers } from './warning';

declare global {
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

export default function setupQUnit({ runningProdBuild }: { runningProdBuild: boolean }) {
  let env = {
    runningProdBuild,
    getDebugFunction,
    setDebugFunction,
  } as DebugEnv;

  let originalModule = QUnit.module;

  QUnit.module = function(name: string, callback: any) {
    return originalModule(name, function(hooks) {
      setupContainersCheck(hooks);
      setupNamespacesCheck(hooks);
      setupRunLoopCheck(hooks);
      setupAssertionHelpers(hooks, env);
      setupDeprecationHelpers(hooks, env);
      setupWarningHelpers(hooks, env);

      callback(hooks);
    });
  };

  QUnit.assert.rejects = async function(
    promise: Promise<any>,
    expected?: RegExp | string,
    message?: string
  ) {
    let threw = false;

    try {
      await promise;
    } catch (e) {
      threw = true;

      QUnit.assert.throws(
        () => {
          throw e;
        },
        expected,
        message
      );
    }

    if (!threw) {
      QUnit.assert.ok(false, `expected an error to be thrown: ${expected}`);
    }
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
