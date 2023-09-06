import type * as EmberTesting from 'ember-testing';

export let registerAsyncHelper: (typeof EmberTesting.Test)['registerAsyncHelper'];
export let registerHelper: (typeof EmberTesting.Test)['registerHelper'];
export let registerWaiter: (typeof EmberTesting.Test)['registerWaiter'];
export let unregisterHelper: (typeof EmberTesting.Test)['unregisterHelper'];
export let unregisterWaiter: (typeof EmberTesting.Test)['unregisterWaiter'];
export let _impl: typeof EmberTesting | undefined;;

let testingNotAvailableMessage = () => {
  throw new Error('Attempted to use test utilities, but `ember-testing` was not included');
};

registerAsyncHelper = testingNotAvailableMessage;
registerHelper = testingNotAvailableMessage;
registerWaiter = testingNotAvailableMessage;
unregisterHelper = testingNotAvailableMessage;
unregisterWaiter = testingNotAvailableMessage;

export function registerTestImplementaiton(impl: typeof EmberTesting) {
  let { Test } = impl;
  registerAsyncHelper = Test.registerAsyncHelper;
  registerHelper = Test.registerHelper;
  registerWaiter = Test.registerWaiter;
  unregisterHelper = Test.unregisterHelper;
  unregisterWaiter = Test.unregisterWaiter;
  _impl = impl;
}
