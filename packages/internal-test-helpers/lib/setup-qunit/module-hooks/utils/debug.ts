import { DebugAssertType } from '@ember/debug';
import { DebugEnv } from '../utils';
import MethodCallTracker from './method-call-tracker';

class DebugAssert<TMethodName extends DebugAssertType> {
  private tracker: MethodCallTracker<TMethodName> | null;
  protected readonly methodName: TMethodName;
  protected readonly env: DebugEnv;

  constructor(methodName: TMethodName, env: DebugEnv) {
    this.methodName = methodName;
    this.env = env;
    this.tracker = null;
  }

  inject() {}

  restore() {
    this.reset();
  }

  reset() {
    if (this.tracker) {
      this.tracker.restoreMethod();
    }

    this.tracker = null;
  }

  assert() {
    if (this.tracker) {
      this.tracker.assert();
    }
  }

  // Run an expectation callback within the context of a new tracker, optionally
  // accepting a function to run, which asserts immediately
  runExpectation<T>(
    func: (() => T) | undefined,
    callback: (tracker: MethodCallTracker<TMethodName>) => void,
    async?: false
  ): T;
  runExpectation<T>(
    func: () => PromiseLike<T>,
    callback: (tracker: MethodCallTracker<TMethodName>) => void,
    async: true
  ): Promise<T>;
  runExpectation<T>(
    func: (() => PromiseLike<T>) | (() => T) | undefined,
    callback: (tracker: MethodCallTracker<TMethodName>) => void,
    async = false
  ): Promise<T> | T | undefined {
    let originalTracker: MethodCallTracker<TMethodName> | null = null;

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
      const finalize = () => {
        this.assert();
        this.reset();

        this.tracker = originalTracker;
      };

      if (async) {
        return (async () => {
          try {
            return await func();
          } finally {
            finalize();
          }
        })();
      }

      try {
        return func() as T;
      } finally {
        finalize();
      }
    }

    return;
  }
}

export default DebugAssert;
