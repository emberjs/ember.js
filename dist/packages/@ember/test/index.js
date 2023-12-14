export let registerAsyncHelper;
export let registerHelper;
export let registerWaiter;
export let unregisterHelper;
export let unregisterWaiter;
export let _impl;
let testingNotAvailableMessage = () => {
  throw new Error('Attempted to use test utilities, but `ember-testing` was not included');
};
registerAsyncHelper = testingNotAvailableMessage;
registerHelper = testingNotAvailableMessage;
registerWaiter = testingNotAvailableMessage;
unregisterHelper = testingNotAvailableMessage;
unregisterWaiter = testingNotAvailableMessage;
export function registerTestImplementaiton(impl) {
  let {
    Test
  } = impl;
  registerAsyncHelper = Test.registerAsyncHelper;
  registerHelper = Test.registerHelper;
  registerWaiter = Test.registerWaiter;
  unregisterHelper = Test.unregisterHelper;
  unregisterWaiter = Test.unregisterWaiter;
  _impl = impl;
}