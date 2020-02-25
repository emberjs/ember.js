import { callWithStub, DebugEnv, Message } from './utils';
import DebugAssert from './utils/debug';

type Block = () => void;
type ExpectNoWarningFunc = (func?: (() => void) | undefined) => void;
type ExpectWarningFunc = {
  (block?: Block, expectedMessage?: Message): void;
  (expectedMessage?: Message): void;
};
type IgnoreWarningFunc = (func: () => void) => void;

declare global {
  interface Window {
    expectNoWarning?: ExpectNoWarningFunc;
    expectWarning?: ExpectWarningFunc;
    ignoreWarning?: IgnoreWarningFunc;
  }
}

export function setupWarningHelpers(hooks: NestedHooks, env: DebugEnv) {
  let assertion = new WarningAssert(env);

  hooks.beforeEach(function() {
    assertion.reset();
    assertion.inject();
  });

  hooks.afterEach(function() {
    assertion.assert();
    assertion.restore();
  });
}

class WarningAssert extends DebugAssert<'warn'> {
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
    let expectNoWarning: ExpectNoWarningFunc = func => {
      if (typeof func !== 'function') {
        func = undefined;
      }

      this.runExpectation(func, tracker => {
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
    let expectWarning: ExpectWarningFunc = (
      messageOrBlock?: Message | Block,
      maybeMessage?: Message
    ) => {
      const message =
        maybeMessage === undefined
          ? typeof messageOrBlock === 'string'
            ? messageOrBlock
            : undefined
          : maybeMessage;
      const func = typeof messageOrBlock === 'function' ? messageOrBlock : undefined;

      this.runExpectation(func, tracker => {
        if (tracker.isExpectingNoCalls()) {
          throw new Error('expectWarning was called after expectNoWarning was called!');
        }

        tracker.expectCall(message);
      });
    };

    let ignoreWarning: IgnoreWarningFunc = func => {
      callWithStub(this.env, 'warn', func);
    };

    self.expectNoWarning = expectNoWarning;
    self.expectWarning = expectWarning;
    self.ignoreWarning = ignoreWarning;
  }

  restore() {
    super.restore();
    delete self.expectWarning;
    delete self.expectNoWarning;
    delete self.ignoreWarning;
  }
}

export default WarningAssert;
