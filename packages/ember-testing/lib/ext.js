/**
  Sets Ember up for testing. This is useful to perform
  basic setup steps in order to unit test.
  
  Use `App.setupForTesting` to perform integration tests (full
  application testing).

  @method setupForTesting
  @namespace Ember
*/
Ember.setupForTesting = function() {
  Ember.testing = true;

  // if adapter is not manually set default to QUnit
  if (!Ember.Test.adapter) {
    Ember.Test.adapter = Ember.Test.QUnitAdapter.create();
  }
};
