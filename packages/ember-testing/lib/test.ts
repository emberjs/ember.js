/**
  @module ember
*/
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
  registerWaiter,
  unregisterWaiter,
  checkWaiters,
};

export default Test;
