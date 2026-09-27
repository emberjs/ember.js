import type * as EmberTesting from 'ember-testing';

export let registerWaiter: (typeof EmberTesting.Test)['registerWaiter'];
export let unregisterWaiter: (typeof EmberTesting.Test)['unregisterWaiter'];
export let _impl: typeof EmberTesting | undefined;

let testingNotAvailableMessage = () => {
  throw new Error('Attempted to use test utilities, but `ember-testing` was not included');
};

registerWaiter = testingNotAvailableMessage;
unregisterWaiter = testingNotAvailableMessage;

export function registerTestImplementation(impl: typeof EmberTesting) {
  let { Test } = impl;
  registerWaiter = Test.registerWaiter;
  unregisterWaiter = Test.unregisterWaiter;
  _impl = impl;
}
