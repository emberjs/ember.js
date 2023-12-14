declare module 'ember-testing/lib/test/promise' {
  /// <reference types="rsvp" />
  import { RSVP } from '@ember/-internals/runtime';
  type Executor<T> = (
    resolve: (value?: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void
  ) => void;
  type OnFulfilled<T, TResult = T> = (value: T) => TResult | PromiseLike<TResult>;
  export default class TestPromise<T> extends RSVP.Promise<T> {
    constructor(executor: Executor<T>, label?: string);
    then<TResult1 = T, TResult2 = never>(
      onFulfilled?: OnFulfilled<T, TResult1> | null,
      onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
      label?: string
    ): RSVP.Promise<TResult1 | TResult2>;
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
  export function promise<T>(resolver: Executor<T>, label?: string): TestPromise<T>;
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
  export function resolve(result: unknown, label?: string): RSVP.default.Promise<unknown>;
  export function getLastPromise(): TestPromise<unknown> | null;
  export {};
}
