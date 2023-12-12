import { DEBUG } from '@glimmer/env';
import type { DebugEnv, Message } from './utils';
import { callWithStub, checkTest } from './utils';

type ExpectAssertionFunc = (func: () => void, expectedMessage: Message) => void;
type IgnoreAssertionFunc = (func: () => void) => void;

type ExtendedWindow = Window &
  typeof globalThis & {
    expectAssertion: ExpectAssertionFunc | null;
    ignoreAssertion: IgnoreAssertionFunc | null;
  };

const BREAK = {};

/*
  This assertion helper is used to test assertions made using Ember.assert.
  It injects two helpers onto `window`:

  - expectAssertion(func: Function, [expectedMessage: String | RegExp])

  This function calls `func` and asserts that `Ember.assert` is invoked during
  the execution. Moreover, it takes a String or a RegExp as a second optional
  argument that can be used to test if a specific assertion message was
  generated.

  - ignoreAssertion(func: Function)

  This function calls `func` and disables `Ember.assert` during the execution.
  In particular, this prevents `Ember.assert` from throw errors that would
  disrupt the control flow.
*/
export function setupAssertionHelpers(hooks: NestedHooks, env: DebugEnv): void {
  let originalAssertFunc = env.getDebugFunction('assert');

  hooks.beforeEach(function (assert) {
    let expectAssertion: ExpectAssertionFunc = (func: () => void, expectedMessage: Message) => {
      if (!DEBUG) {
        assert.ok(true, 'Assertions disabled in production builds.');
        return;
      }

      let sawCall = false;
      let actualMessage: string | undefined = undefined;

      // The try-catch statement is used to "exit" `func` as soon as
      // the first useful assertion has been produced.
      try {
        callWithStub(env, 'assert', func, (message, test) => {
          sawCall = true;
          if (checkTest(test)) {
            return;
          }
          actualMessage = message;
          throw BREAK;
        });
      } catch (e) {
        if (e !== BREAK) {
          throw e;
        }
      }

      check(assert, sawCall, actualMessage, expectedMessage);
    };

    let ignoreAssertion: IgnoreAssertionFunc = (func) => {
      callWithStub(env, 'assert', func);
    };

    let w = window as ExtendedWindow;
    w.expectAssertion = expectAssertion;
    w.ignoreAssertion = ignoreAssertion;
  });

  hooks.afterEach(function () {
    // Edge will occasionally not run finally blocks, so we have to be extra
    // sure we restore the original assert function
    env.setDebugFunction('assert', originalAssertFunc);

    let w = window as ExtendedWindow;
    w.expectAssertion = null;
    w.ignoreAssertion = null;
  });
}

function check(
  assert: Assert,
  sawCall: boolean,
  actualMessage: string | undefined,
  expectedMessage: string | RegExp
) {
  // Run assertions in an order that is useful when debugging a test failure.
  if (!sawCall) {
    assert.ok(false, `Expected Ember.assert to be called (Not called with any value).`);
  } else if (!actualMessage) {
    assert.ok(
      false,
      `Expected a failing Ember.assert (Ember.assert called, but without a failing test).`
    );
  } else {
    if (expectedMessage) {
      if (expectedMessage instanceof RegExp) {
        assert.ok(
          expectedMessage.test(actualMessage),
          `Expected failing Ember.assert: '${expectedMessage}', but got '${actualMessage}'.`
        );
      } else {
        assert.equal(
          actualMessage,
          expectedMessage,
          `Expected failing Ember.assert: '${expectedMessage}', but got '${actualMessage}'.`
        );
      }
    } else {
      // Positive assertion that assert was called
      assert.ok(true, 'Expected a failing Ember.assert.');
    }
  }
}
