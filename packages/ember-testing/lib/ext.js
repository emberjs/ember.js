require('ember-testing/test');

var Test = Ember.Test;

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

  Test.pendingAjaxRequests = 0;

  Ember.$(document).ajaxSend(function() {
    Test.pendingAjaxRequests++;
  });

  Ember.$(document).ajaxComplete(function() {
    Ember.assert("An ajaxComplete event which would cause the number of pending AJAX " +
                 "requests to be negative has been triggered. This is most likely " +
                 "caused by AJAX events that were started before calling " +
                 "`injectTestHelpers()`.", Test.pendingAjaxRequests !== 0);
    Test.pendingAjaxRequests--;
  });
};
