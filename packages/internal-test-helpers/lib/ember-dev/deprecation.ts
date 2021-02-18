import { assert } from '@ember/debug';
import DebugAssert from './debug';
import { callWithStub, DebugEnv, Message } from './utils';
declare global {
  interface Window {
    expectNoDeprecation: DeprecationAssert['expectNoDeprecation'] | undefined;
    expectNoDeprecationAsync: DeprecationAssert['expectNoDeprecationAsync'] | undefined;
    expectDeprecation: DeprecationAssert['expectDeprecation'] | undefined;
    expectDeprecationAsync: DeprecationAssert['expectDeprecationAsync'] | undefined;
    ignoreDeprecation: DeprecationAssert['ignoreDeprecation'] | undefined;
  }
}

export function setupDeprecationHelpers(hooks: NestedHooks, env: DebugEnv): void {
  let assertion = new DeprecationAssert(env);

  hooks.beforeEach(function () {
    assertion.reset();
    assertion.inject();
  });

  hooks.afterEach(function () {
    assertion.assert();
    assertion.restore();
  });
}

export let expectDeprecation: DeprecationAssert['expectDeprecation'] = () => {
  throw new Error(
    'DeprecationAssert: To use `expectDeprecation` in a test you must call `setupDeprecationHelpers` first'
  );
};

export let ignoreDeprecation: DeprecationAssert['ignoreDeprecation'] = () => {
  throw new Error(
    'DeprecationAssert: To use `ignoreDeprecation` in a test you must call `setupDeprecationHelpers` first'
  );
};

export let expectDeprecationAsync: DeprecationAssert['expectDeprecationAsync'] = () => {
  throw new Error(
    'DeprecationAssert: To use `expectDeprecationAsync` in a test you must call `setupDeprecationHelpers` first'
  );
};

export let expectNoDeprecation: DeprecationAssert['expectNoDeprecation'] = () => {
  throw new Error(
    'DeprecationAssert: To use `expectNoDeprecation` in a test you must call `setupDeprecationHelpers` first'
  );
};

export let expectNoDeprecationAsync: DeprecationAssert['expectNoDeprecationAsync'] = () => {
  throw new Error(
    'DeprecationAssert: To use `expectNoDeprecationAsync` in a test you must call `setupDeprecationHelpers` first'
  );
};

class DeprecationAssert extends DebugAssert {
  constructor(env: DebugEnv) {
    super('deprecate', env);
  }

  inject(): void {
    window.expectNoDeprecation = expectNoDeprecation = this.expectNoDeprecation.bind(this);
    window.expectNoDeprecationAsync = expectNoDeprecationAsync = this.expectNoDeprecationAsync.bind(
      this
    );
    window.expectDeprecation = expectDeprecation = this.expectDeprecation.bind(this);
    window.expectDeprecationAsync = expectDeprecationAsync = this.expectDeprecationAsync.bind(this);
    window.ignoreDeprecation = ignoreDeprecation = this.ignoreDeprecation.bind(this);
    super.inject();
  }

  restore(): void {
    super.restore();
    window.expectNoDeprecation = undefined;
    window.expectNoDeprecationAsync = undefined;
    window.expectDeprecation = undefined;
    window.expectDeprecationAsync = undefined;
    window.ignoreDeprecation = undefined;
  }

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
  private expectNoDeprecation(func?: () => void): void {
    this.runExpectation(func, (tracker) => {
      if (tracker.isExpectingCalls()) {
        throw new Error('expectNoDeprecation was called after expectDeprecation was called!');
      }

      tracker.expectNoCalls();
    });
  }

  // Expects no deprecation to happen within an async function.
  //
  // expectNoDeprecationAsync(async function() {
  //   await fancyAsyncThing();
  // });
  //
  private async expectNoDeprecationAsync(func: () => Promise<void>): Promise<void> {
    await this.runExpectation(
      func,
      (tracker) => {
        if (tracker.isExpectingCalls()) {
          throw new Error('expectNoDeprecation was called after expectDeprecation was called!');
        }

        tracker.expectNoCalls();
      },
      true
    );
  }

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
  private expectDeprecation(isEnabled?: boolean): void;
  private expectDeprecation(message: Message, isEnabled?: boolean): void;
  private expectDeprecation(func: () => void, message?: Message): void;
  private expectDeprecation(func: () => void, isEnabled?: boolean): void;
  private expectDeprecation(func: () => void, message: Message, isEnabled: boolean): void;
  private expectDeprecation(
    messageOrFuncOrIsEnabled: boolean | Message | (() => void) = true,
    messageOrIsEnabled: Message | boolean = true,
    isEnabled = true
  ): void {
    let func: (() => void) | undefined;
    let message: Message | undefined;

    if (typeof messageOrFuncOrIsEnabled === 'boolean') {
      func = undefined;
      isEnabled = messageOrFuncOrIsEnabled;
    } else if (typeof messageOrFuncOrIsEnabled === 'function') {
      func = messageOrFuncOrIsEnabled;

      if (typeof messageOrIsEnabled === 'boolean') {
        isEnabled = messageOrIsEnabled;
      } else {
        message = messageOrIsEnabled;
      }
    } else {
      assert(
        `second argument must be isEnabled flag, got ${messageOrIsEnabled}`,
        typeof messageOrIsEnabled === 'boolean'
      );

      message = messageOrFuncOrIsEnabled;
      isEnabled = messageOrIsEnabled;
    }

    if (isEnabled) {
      this.runExpectation(func, (tracker) => {
        if (tracker.isExpectingNoCalls()) {
          throw new Error('expectDeprecation was called after expectNoDeprecation was called!');
        }

        tracker.expectCall(message, ['id', 'until']);
      });
    } else {
      this.expectNoDeprecation(func);
    }
  }

  private async expectDeprecationAsync(func: () => Promise<void>, message?: Message): Promise<void>;
  private async expectDeprecationAsync(
    func: () => Promise<void>,
    isEnabled?: boolean
  ): Promise<void>;
  private async expectDeprecationAsync(
    func: () => Promise<void>,
    message: Message,
    isEnabled: boolean
  ): Promise<void>;
  private async expectDeprecationAsync(
    func: () => Promise<void>,
    messageOrIsEnabled: Message | boolean = true,
    isEnabled = true
  ): Promise<void> {
    let message: Message | undefined;

    if (typeof messageOrIsEnabled === 'boolean') {
      isEnabled = messageOrIsEnabled;
    } else {
      message = messageOrIsEnabled;
    }

    if (isEnabled) {
      await this.runExpectation(
        func,
        (tracker) => {
          if (tracker.isExpectingNoCalls()) {
            throw new Error('expectDeprecation was called after expectNoDeprecation was called!');
          }

          tracker.expectCall(message, ['id', 'until']);
        },
        true
      );
    } else {
      await this.expectNoDeprecationAsync(func);
    }
  }

  private ignoreDeprecation(func: () => void): void {
    callWithStub(this.env, 'deprecate', func);
  }
}

export default DeprecationAssert;
