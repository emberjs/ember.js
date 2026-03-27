/**
  @module ember
*/
import { helpers, registerHelper, registerAsyncHelper, unregisterHelper } from './test/helpers';
import TestPromise, { promise, resolve } from './test/promise';
import { checkWaiters, registerWaiter, unregisterWaiter } from './test/waiters';

/**
  This is a container for an assortment of testing related functionality:

  * Choose your default test adapter (for your framework of choice).
  * Register/Unregister additional test helpers.
  * Setup callbacks to be fired when the test helpers are injected into
    your application.

  @class Test
  @namespace Ember
  @public
*/
const Test = {
  /**
    Hash containing all known test helpers.

    @property _helpers
    @private
    @since 1.7.0
  */
  _helpers: helpers,

  registerHelper,
  registerAsyncHelper,
  unregisterHelper,
  Promise: TestPromise,
  promise,
  resolve,
  registerWaiter,
  unregisterWaiter,
  checkWaiters,
};

export default Test;
