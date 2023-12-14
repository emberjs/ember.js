/**
  @module ember
*/
import { helpers, registerHelper, registerAsyncHelper, unregisterHelper } from './test/helpers';
import { onInjectHelpers } from './test/on_inject_helpers';
import TestPromise, { promise, resolve } from './test/promise';
import { checkWaiters, registerWaiter, unregisterWaiter } from './test/waiters';
import { getAdapter, setAdapter } from './test/adapter';
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
  onInjectHelpers,
  Promise: TestPromise,
  promise,
  resolve,
  registerWaiter,
  unregisterWaiter,
  checkWaiters
};
/**
 Used to allow ember-testing to communicate with a specific testing
 framework.

 You can manually set it before calling `App.setupForTesting()`.

 Example:

 ```javascript
 Ember.Test.adapter = MyCustomAdapter.create()
 ```

 If you do not set it, ember-testing will default to `Ember.Test.QUnitAdapter`.

 @public
 @for Ember.Test
 @property adapter
 @type {Class} The adapter to be used.
 @default Ember.Test.QUnitAdapter
*/
Object.defineProperty(Test, 'adapter', {
  get: getAdapter,
  set: setAdapter
});
export default Test;