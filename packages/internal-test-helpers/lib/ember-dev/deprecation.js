import DebugAssert from './debug';
import { callWithStub } from './utils';

class DeprecationAssert extends DebugAssert {
  constructor(env) {
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
    let expectNoDeprecation = func => {
      if (typeof func !== 'function') {
        func = null;
      }

      this.runExpectation(func, tracker => {
        if (tracker.isExpectingCalls()) {
          throw new Error(
            'expectNoDeprecation was called after expectDeprecation was called!'
          );
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
    let expectDeprecation = (func, message) => {
      if (typeof func !== 'function') {
        message = func;
        func = null;
      }

      this.runExpectation(func, tracker => {
        if (tracker.isExpectingNoCalls()) {
          throw new Error(
            'expectDeprecation was called after expectNoDeprecation was called!'
          );
        }

        tracker.expectCall(message);
      });
    };

    let ignoreDeprecation = func => {
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
