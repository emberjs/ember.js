import DebugAssert from './debug';
import { callWithStub, DebugEnv, Message } from './utils';

type ExpectNoWarningFunc = (func?: (() => void) | undefined) => void;
type ExpectWarningFunc = (
  func: (() => void) | undefined | Message,
  expectedMessage: Message
) => void;
type IgnoreWarningFunc = (func: () => void) => void;

declare global {
  interface Window {
    expectNoWarning: ExpectNoWarningFunc | null;
    expectWarning: ExpectWarningFunc | null;
    ignoreWarning: IgnoreWarningFunc | null;
  }
}

export function setupWarningHelpers(hooks: NestedHooks, env: DebugEnv) {
  let assertion = new WarningAssert(env);

  hooks.beforeEach(function () {
    assertion.reset();
    assertion.inject();
  });

  hooks.afterEach(function () {
    assertion.assert();
    assertion.restore();
  });
}

class WarningAssert extends DebugAssert {
  constructor(env: DebugEnv) {
    super('warn', env);
  }

  inject() {
    // Expects no warning to happen within a function, or if no function is
    // passed, from the time of calling until the end of the test.
    //
    // expectNoWarning(function() {
    //   fancyNewThing();
    // });
    //
    // expectNoWarning();
    // Ember.warn("Oh snap, didn't expect that");
    //
    let expectNoWarning: ExpectNoWarningFunc = (func) => {
      if (typeof func !== 'function') {
        func = undefined;
      }

      this.runExpectation(func, (tracker) => {
        if (tracker.isExpectingCalls()) {
          throw new Error('expectNoWarning was called after expectWarning was called!');
        }

        tracker.expectNoCalls();
      });
    };

    // Expect a warning to happen within a function, or if no function is
    // passed, from the time of calling until the end of the test. Can be called
    // multiple times to assert warnings with different specific messages
    // happened.
    //
    // expectWarning(function() {
    //   Ember.warn("Times they are a-changin'");
    // }, /* optionalStringOrRegex */);
    //
    // expectWarning(/* optionalStringOrRegex */);
    // Ember.warn("Times definitely be changin'");
    //
    let expectWarning: ExpectWarningFunc = (func, message) => {
      let actualFunc: (() => void) | undefined;
      if (typeof func !== 'function') {
        message = func as Message;
        actualFunc = undefined;
      } else {
        actualFunc = func;
      }

      this.runExpectation(actualFunc, (tracker) => {
        if (tracker.isExpectingNoCalls()) {
          throw new Error('expectWarning was called after expectNoWarning was called!');
        }

        tracker.expectCall(message);
      });
    };

    let ignoreWarning: IgnoreWarningFunc = (func) => {
      callWithStub(this.env, 'warn', func);
    };

    window.expectNoWarning = expectNoWarning;
    window.expectWarning = expectWarning;
    window.ignoreWarning = ignoreWarning;
  }

  restore() {
    super.restore();
    window.expectWarning = null;
    window.expectNoWarning = null;
    window.ignoreWarning = null;
  }
}

export default WarningAssert;
