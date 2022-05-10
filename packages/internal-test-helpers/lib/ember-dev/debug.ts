import MethodCallTracker from './method-call-tracker';
import type { DebugEnv } from './utils';

class DebugAssert {
  private tracker: MethodCallTracker | null;
  protected readonly methodName: string;
  protected readonly env: DebugEnv;

  constructor(methodName: string, env: DebugEnv) {
    this.methodName = methodName;
    this.env = env;
    this.tracker = null;
  }

  inject(): void {}

  restore(): void {
    this.reset();
  }

  reset(): void {
    if (this.tracker) {
      this.tracker.restoreMethod();
    }

    this.tracker = null;
  }

  assert(): void {
    if (this.tracker) {
      this.tracker.assert();
    }
  }

  // Run an expectation callback within the context of a new tracker, optionally
  // accepting a function to run, which asserts immediately
  runExpectation(
    func: (() => void) | undefined,
    callback: (tracker: MethodCallTracker) => void
  ): void;
  runExpectation(
    func: () => Promise<void>,
    callback: (tracker: MethodCallTracker) => void,
    async: true
  ): Promise<void>;
  runExpectation(
    func: (() => void) | (() => Promise<void>) | undefined,
    callback: (tracker: MethodCallTracker) => void,
    async = false
  ): void | Promise<void> {
    let originalTracker: MethodCallTracker | null = null;

    // When helpers are passed a callback, they get a new tracker context
    if (func) {
      originalTracker = this.tracker;
      this.tracker = null;
    }

    if (!this.tracker) {
      this.tracker = new MethodCallTracker(this.env, this.methodName);
    }

    // Yield to caller with tracker instance
    callback(this.tracker);

    // Once the given callback is invoked, the pending assertions should be
    // flushed immediately
    if (func) {
      if (async) {
        return (async () => {
          try {
            await func();
          } finally {
            this.assert();
            this.reset();

            this.tracker = originalTracker;
          }
        })();
      } else {
        try {
          func();
        } finally {
          this.assert();
          this.reset();

          this.tracker = originalTracker;
        }
      }
    }
  }
}

export default DebugAssert;
