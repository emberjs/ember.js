import require, { has } from 'require';
import { type Test } from 'ember-testing';

export let registerAsyncHelper: typeof Test['registerAsyncHelper'] | (() => never);
export let registerHelper: typeof Test['registerHelper'] | (() => never);
export let registerWaiter: typeof Test['registerWaiter'] | (() => never);
export let unregisterHelper: typeof Test['unregisterHelper'] | (() => never);
export let unregisterWaiter: typeof Test['unregisterWaiter'] | (() => never);

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
