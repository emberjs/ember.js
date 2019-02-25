import DebugAssert from './debug';
import { callWithStub, DebugEnv, Message } from './utils';

type ExpectNoDeprecationFunc = (func?: () => void) => void;
type ExpectDeprecationFunc = (
  func: () => void | undefined | Message,
  expectedMessage: Message
) => void;
type IgnoreDeprecationFunc = (func: () => void) => void;

declare global {
  interface Window {
    expectNoDeprecation: ExpectNoDeprecationFunc | null;
    expectDeprecation: ExpectDeprecationFunc | null;
    ignoreDeprecation: IgnoreDeprecationFunc | null;
  }
}

export function setupDeprecationHelpers(hooks: NestedHooks, env: DebugEnv) {
  let assertion = new DeprecationAssert(env);

  hooks.beforeEach(function() {
    assertion.reset();
    assertion.inject();
  });

  hooks.afterEach(function() {
    assertion.assert();
    assertion.restore();
  });
}

class DeprecationAssert extends DebugAssert {
  constructor(env: DebugEnv) {
    super('deprecate', env);
  }

  inject() {
    // Expects no deprecation to happen within a function, or if no function is
    // passed, from the time of calling until the end of the test.
    //
    // expectNoDeprecation(function() {
    //   fancyNewThing();
    // });
    //
    // expectNoDeprecation();
    // Ember.deprecate("Old And Busted");
    //
    let expectNoDeprecation: ExpectNoDeprecationFunc = func => {
      if (typeof func !== 'function') {
        func = undefined;
      }

      this.runExpectation(func, tracker => {
        if (tracker.isExpectingCalls()) {
          throw new Error('expectNoDeprecation was called after expectDeprecation was called!');
        }

        tracker.expectNoCalls();
      });
    };

    // Expect a deprecation to happen within a function, or if no function
    // is pass, from the time of calling until the end of the test. Can be called
    // multiple times to assert deprecations with different specific messages
    // were fired.
    //
    // expectDeprecation(function() {
    //   Ember.deprecate("Old And Busted");
    // }, /* optionalStringOrRegex */);
    //
    // expectDeprecation(/* optionalStringOrRegex */);
    // Ember.deprecate("Old And Busted");
    //
    let expectDeprecation: ExpectDeprecationFunc = (func, message) => {
      let actualFunc: (() => void) | undefined;
      if (typeof func !== 'function') {
        message = func as Message;
        actualFunc = undefined;
      } else {
        actualFunc = func;
      }

      this.runExpectation(actualFunc, tracker => {
        if (tracker.isExpectingNoCalls()) {
          throw new Error('expectDeprecation was called after expectNoDeprecation was called!');
        }

        tracker.expectCall(message, ['id', 'until']);
      });
    };

    let ignoreDeprecation: IgnoreDeprecationFunc = func => {
      callWithStub(this.env, 'deprecate', func);
    };

    window.expectNoDeprecation = expectNoDeprecation;
    window.expectDeprecation = expectDeprecation;
    window.ignoreDeprecation = ignoreDeprecation;
  }

  restore() {
    super.restore();
    window.expectDeprecation = null;
    window.expectNoDeprecation = null;
    window.ignoreDeprecation = null;
  }
}

export default DeprecationAssert;
