import { Object as EmberObject } from 'ember-runtime';

function K() { return this; }

/**
 @module ember
 @submodule ember-testing
*/

/**
  The primary purpose of this class is to create hooks that can be implemented
  by an adapter for various test frameworks.

  @class Adapter
  @namespace Ember.Test
  @public
*/
export default EmberObject.extend({
  /**
    This callback will be called whenever an async operation is about to start.

    Override this to call your framework's methods that handle async
    operations.

    @public
    @method asyncStart
  */
  asyncStart: K,

  /**
    This callback will be called whenever an async operation has completed.

    @public
    @method asyncEnd
  */
  asyncEnd: K,

  /**
    Removes test timeout for current test.

    This allows `pauseTest` test helper to wait forever.
    It should also store an original test timeout value in order to restore it on `resumeTest()`.

    @public
    @method stashTimeout
    @return {function} Function that restores timeout
  */
  stashTimeout: () => K,

  /**
    Override this method with your testing framework's false assertion.
    This function is called whenever an exception occurs causing the testing
    promise to fail.

    QUnit example:

    ```javascript
      exception: function(error) {
        ok(false, error);
      };
    ```

    @public
    @method exception
    @param {String} error The exception to be raised.
  */
  exception(error) {
    throw error;
  }
});
