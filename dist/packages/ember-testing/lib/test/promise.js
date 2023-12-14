import { RSVP } from '@ember/-internals/runtime';
import run from './run';
let lastPromise = null;
export default class TestPromise extends RSVP.Promise {
  constructor(executor, label) {
    super(executor, label);
    lastPromise = this;
  }
  then(onFulfilled, onRejected, label) {
    let normalizedOnFulfilled = typeof onFulfilled === 'function' ? result => isolate(onFulfilled, result) : undefined;
    return super.then(normalizedOnFulfilled, onRejected, label);
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
export function promise(resolver, label) {
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
export function resolve(result, label) {
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
function isolate(onFulfilled, result) {
  // Reset lastPromise for nested helpers
  lastPromise = null;
  let value = onFulfilled(result);
  let promise = lastPromise;
  lastPromise = null;
  // If the method returned a promise
  // return that promise. If not,
  // return the last async helper's promise
  if (value && value instanceof TestPromise || !promise) {
    return value;
  } else {
    return run(() => resolve(promise).then(() => value));
  }
}