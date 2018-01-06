import { callWithStub, checkTest } from './utils';

const BREAK = {};

/*
  This assertion class is used to test assertions made using Ember.assert.
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
export default function AssertionAssert(env) {
  this.env = env;
}

AssertionAssert.prototype = {
  reset() { },
  assert() { },

  inject() {
    let expectAssertion = (func, expectedMessage) => {
      let { assert } = QUnit.config.current;

      if (this.env.runningProdBuild) {
        QUnit.ok(true, 'Assertions disabled in production builds.');
        return;
      }

      let sawCall;
      let actualMessage;

      // The try-catch statement is used to "exit" `func` as soon as
      // the first useful assertion has been produced.
      try {
        callWithStub(this.env, 'assert', func, (message, test) => {
          sawCall = true;
          if (checkTest(test)) { return; }
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

    let ignoreAssertion = (func) => {
      callWithStub(this.env, 'assert', func);
    };

    window.expectAssertion = expectAssertion;
    window.ignoreAssertion = ignoreAssertion;
  },

  restore() {
    window.expectAssertion = null;
    window.ignoreAssertion = null;
  }
};

function check(assert, sawCall, actualMessage, expectedMessage) {
  // Run assertions in an order that is useful when debugging a test failure.
  if (!sawCall) {
    assert.ok(false, `Expected Ember.assert to be called (Not called with any value).`);
  } else if (!actualMessage) {
    assert.ok(false, `Expected a failing Ember.assert (Ember.assert called, but without a failing test).`);
  } else {
    if (expectedMessage) {
      if (expectedMessage instanceof RegExp) {
        assert.ok(expectedMessage.test(actualMessage), `Expected failing Ember.assert: '${expectedMessage}', but got '${actualMessage}'.`);
      } else {
        assert.equal(actualMessage, expectedMessage, `Expected failing Ember.assert: '${expectedMessage}', but got '${actualMessage}'.`);
      }
    } else {
      // Positive assertion that assert was called
      assert.ok(true, 'Expected a failing Ember.assert.');
    }
  }
}
