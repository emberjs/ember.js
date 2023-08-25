import require, { has } from 'require';
import { type Test as TestNS } from 'ember-testing';

export let registerAsyncHelper: (typeof TestNS)['registerAsyncHelper'];
export let registerHelper: (typeof TestNS)['registerHelper'];
export let registerWaiter: (typeof TestNS)['registerWaiter'];
export let unregisterHelper: (typeof TestNS)['unregisterHelper'];
export let unregisterWaiter: (typeof TestNS)['unregisterWaiter'];

if (has('ember-testing')) {
  // SAFETY: since `require` is opaque to TS, we need to inform it that this is
  // the actual type of what we import. This `require` needs to stay in sync
  // with the `import type` statement above. (This cast *increases* safety,
  // because the result of `require` is `any`.)
  let Test = require('ember-testing').Test as typeof TestNS;

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
