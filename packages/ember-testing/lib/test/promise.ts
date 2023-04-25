import { RSVP } from '@ember/-internals/runtime';
import run from './run';

let lastPromise: TestPromise<unknown> | null = null;

type Executor<T> = (
  resolve: (value?: T | PromiseLike<T>) => void,
  reject: (reason?: any) => void
) => void;

type OnFulfilled<T, TResult = T> = (value: T) => TResult | PromiseLike<TResult>;

export default class TestPromise<T> extends RSVP.Promise<T> {
  constructor(executor: Executor<T>, label?: string) {
    super(executor, label);
    lastPromise = this;
  }

  then<TResult1 = T, TResult2 = never>(
    onFulfilled?: OnFulfilled<T, TResult1> | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    label?: string
  ): RSVP.Promise<TResult1 | TResult2> {
    let normalizedOnFulfilled =
      typeof onFulfilled === 'function'
        ? (result: T) => isolate<T, TResult1>(onFulfilled, result)
        : undefined;
    return super.then<TResult1, TResult2>(normalizedOnFulfilled, onRejected, label);
  }
}

/**
  This returns a thenable tailored for testing.  It catches failed
  `onSuccess` callbacks and invokes the `Ember.Test.adapter.exception`
  callback in the last chained then.

  This method should be returned by async helpers such as `wait`.

  @public
  @for Ember.Test
  @method promise
  @param {Function} resolver The function used to resolve the promise.
  @param {String} label An optional string for identifying the promise.
*/
export function promise<T>(resolver: Executor<T>, label?: string) {
  let fullLabel = `Ember.Test.promise: ${label || '<Unknown Promise>'}`;
  return new TestPromise(resolver, fullLabel);
}

/**
  Replacement for `Ember.RSVP.resolve`
  The only difference is this uses
  an instance of `Ember.Test.Promise`

  @public
  @for Ember.Test
  @method resolve
  @param {Mixed} The value to resolve
  @since 1.2.0
*/
export function resolve(result: unknown, label?: string) {
  return TestPromise.resolve(result, label);
}

export function getLastPromise() {
  return lastPromise;
}

// This method isolates nested async methods
// so that they don't conflict with other last promises.
//
// 1. Set `Ember.Test.lastPromise` to null
// 2. Invoke method
// 3. Return the last promise created during method
function isolate<T, TResult = T>(onFulfilled: OnFulfilled<T, TResult>, result: T) {
  // Reset lastPromise for nested helpers
  lastPromise = null;

  let value = onFulfilled(result);

  let promise = lastPromise;
  lastPromise = null;

  // If the method returned a promise
  // return that promise. If not,
  // return the last async helper's promise
  if ((value && value instanceof TestPromise) || !promise) {
    return value;
  } else {
    return run(() => resolve(promise).then(() => value));
  }
}
