import { callWithStub, DebugEnv, Message } from './utils';
import DebugAssert from './utils/debug';

export type Block = () => void;
export type AsyncBlock<T> = () => PromiseLike<T>;

export type ExpectNoDeprecationFunc = (func?: Block) => void;
export type ExpectDeprecationAsyncFunc = <T>(
  func: AsyncBlock<T>,
  expectedMessage: Message
) => Promise<T>;

export type ExpectDeprecationFunc = {
  (block?: Block, expectedMessage?: Message): void;
  (expectedMessage?: Message): void;
};

export type IgnoreDeprecationFunc = (func: () => void) => void;

declare global {
  interface Window {
    expectNoDeprecation: ExpectNoDeprecationFunc | null;
    expectDeprecation: ExpectDeprecationFunc | null;
    expectDeprecationAsync: ExpectDeprecationAsyncFunc | null;
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

class DeprecationAssert extends DebugAssert<'deprecate'> {
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
    let expectDeprecation: ExpectDeprecationFunc = (
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
          throw new Error('expectDeprecation was called after expectNoDeprecation was called!');
        }

        tracker.expectCall(message, ['id', 'until']);
      });
    };

    let expectDeprecationAsync: ExpectDeprecationAsyncFunc = async (func, message) => {
      return await this.runExpectation(
        func,
        tracker => {
          if (tracker.isExpectingNoCalls()) {
            throw new Error('expectDeprecation was called after expectNoDeprecation was called!');
          }

          tracker.expectCall(message, ['id', 'until']);
        },
        true
      );
    };

    let ignoreDeprecation: IgnoreDeprecationFunc = func => {
      callWithStub(this.env, 'deprecate', func);
    };

    self.expectNoDeprecation = expectNoDeprecation;
    self.expectDeprecation = expectDeprecation;
    self.expectDeprecationAsync = expectDeprecationAsync;
    self.ignoreDeprecation = ignoreDeprecation;
  }

  restore() {
    super.restore();
    delete self.expectDeprecation;
    delete self.expectDeprecationAsync;
    delete self.expectNoDeprecation;
    delete self.ignoreDeprecation;
  }
}

export default DeprecationAssert;
