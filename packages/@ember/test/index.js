import require, { has } from 'require';

export let registerAsyncHelper;
export let registerHelper;
export let registerWaiter;
export let unregisterHelper;
export let unregisterWaiter;

if (has('ember-testing')) {
  let { Test } = require('ember-testing');

  registerAsyncHelper = Test.registerAsyncHelper;
  registerHelper = Test.registerHelper;
  registerWaiter = Test.registerWaiter;
  unregisterHelper = Test.unregisterHelper;
  unregisterWaiter = Test.unregisterWaiter;
} else {
  let testingNotAvailableMessage = () => {
    throw new Error('Attempted to use test utilities, but `ember-testing` was not included');
  };

  registerAsyncHelper = testingNotAvailableMessage;
  registerHelper = testingNotAvailableMessage;
  registerWaiter = testingNotAvailableMessage;
  unregisterHelper = testingNotAvailableMessage;
  unregisterWaiter = testingNotAvailableMessage;
}
