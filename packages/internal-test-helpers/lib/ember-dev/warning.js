import DebugAssert from './debug';
import { callWithStub } from './utils';

class WarningAssert extends DebugAssert {
  constructor(env) {
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
    let expectNoWarning = (func) => {
      if (typeof func !== 'function') {
        func = null;
      }

      this.runExpectation(func, (tracker) => {
        if (tracker.isExpectingCalls()) {
          throw new Error("expectNoWarning was called after expectWarning was called!");
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
    let expectWarning = (fn, message) => {
      if (typeof fn !== 'function') {
        message = fn;
        fn = null;
      }

      this.runExpectation(fn, (tracker) => {
        if (tracker.isExpectingNoCalls()) {
          throw new Error("expectWarning was called after expectNoWarning was called!");
        }

        tracker.expectCall(message);
      });
    };

    let ignoreWarning = (func) => {
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
