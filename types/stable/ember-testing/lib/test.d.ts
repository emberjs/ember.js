declare module 'ember-testing/lib/test' {
  /**
      @module ember
    */
  import {
    registerHelper,
    registerAsyncHelper,
    unregisterHelper,
  } from 'ember-testing/lib/test/helpers';
  import { onInjectHelpers } from 'ember-testing/lib/test/on_inject_helpers';
  import TestPromise, { promise, resolve } from 'ember-testing/lib/test/promise';
  import { checkWaiters, registerWaiter, unregisterWaiter } from 'ember-testing/lib/test/waiters';
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
  const Test: {
    /**
          Hash containing all known test helpers.
      
          @property _helpers
          @private
          @since 1.7.0
        */
    _helpers: Record<
      string,
      {
        method: import('@ember/-internals/utility-types').AnyFn;
        meta: {
          wait: boolean;
        };
      }
    >;
    registerHelper: typeof registerHelper;
    registerAsyncHelper: typeof registerAsyncHelper;
    unregisterHelper: typeof unregisterHelper;
    onInjectHelpers: typeof onInjectHelpers;
    Promise: typeof TestPromise;
    promise: typeof promise;
    resolve: typeof resolve;
    registerWaiter: typeof registerWaiter;
    unregisterWaiter: typeof unregisterWaiter;
    checkWaiters: typeof checkWaiters;
  };
  export default Test;
}
