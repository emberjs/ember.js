require('ember-testing/test');

var Test = Ember.Test;

/**
  @class Adapter
  @namespace Ember.Test
*/
Test.Adapter = Ember.Object.extend({
  /**
    @public

    This callback will be called
    whenever an async operation
    is about to start.

    Override this to call your
    framework's methods
    that handle async operations

    @method asyncStart
  */
  asyncStart: Ember.K,

  /**
    @public

    This callback will be called
    whenever an async operation
    has completed.

    @method asyncEnd
  */
  asyncEnd: Ember.K,

  /**
   @public

    Override this method with your
    testing framework's false assertion
    This function is called whenever
    an exception occurs causing the testing
    promise to fail.

    QUnit example:

    ```javascript
    exception: function(error) {
      ok(false, error);
    }
    ```

    @method exception
    @param reason {String}
  */
  exception: function(error) {
    setTimeout(function() {
      throw error;
    });
  }
});

/**
  @class QUnitAdapter
  @namespace Ember.Test
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
