require('ember-testing/test');

/**
 @module ember
 @submodule ember-testing
*/

var Test = Ember.Test;

/**
  The primary purpose of this class is to create hooks that can be implemented
  by an adapter for various test frameworks.

  @class Adapter
  @namespace Ember.Test
*/
Test.Adapter = Ember.Object.extend({
  /**
    This callback will be called whenever an async operation is about to start.

    Override this to call your framework's methods that handle async
    operations.

    @public
    @method asyncStart
  */
  asyncStart: Ember.K,

  /**
    This callback will be called whenever an async operation has completed.

    @public
    @method asyncEnd
  */
  asyncEnd: Ember.K,

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
  exception: function(error) {
    setTimeout(function() {
      throw error;
    });
  }
});

/**
  This class implements the methods defined by Ember.Test.Adapter for the
  QUnit testing framework.

  @class QUnitAdapter
  @namespace Ember.Test
  @extends Ember.Test.Adapter
*/
Test.QUnitAdapter = Test.Adapter.extend({
  asyncStart: function() {
    stop();
  },
  asyncEnd: function() {
    start();
  },
  exception: function(error) {
    ok(false, Ember.inspect(error));
  }
});
