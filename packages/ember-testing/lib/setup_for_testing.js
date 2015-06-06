import Ember from "ember-metal/core";
// import Test from "ember-testing/test";  // ES6TODO: fix when cycles are supported
import QUnitAdapter from "ember-testing/adapters/qunit";
import jQuery from "ember-views/system/jquery";

var Test, requests;

function incrementAjaxPendingRequests(_, xhr) {
  requests.push(xhr);
  Test.pendingAjaxRequests = requests.length;
}

function decrementAjaxPendingRequests(_, xhr) {
  for (var i=0;i<requests.length;i++) {
    if (xhr === requests[i]) {
      requests.splice(i, 1);
    }
  }
  Test.pendingAjaxRequests = requests.length;
}

/**
  Sets Ember up for testing. This is useful to perform
  basic setup steps in order to unit test.

  Use `App.setupForTesting` to perform integration tests (full
  application testing).

  @method setupForTesting
  @namespace Ember
  @since 1.5.0
  @private
*/
export default function setupForTesting() {
  if (!Test) { Test = requireModule('ember-testing/test')['default']; }

  Ember.testing = true;

  // if adapter is not manually set default to QUnit
  if (!Test.adapter) {
    Test.adapter = QUnitAdapter.create();
  }

  requests = [];
  Test.pendingAjaxRequests = requests.length;

  jQuery(document).off('ajaxSend', incrementAjaxPendingRequests);
  jQuery(document).off('ajaxComplete', decrementAjaxPendingRequests);
  jQuery(document).on('ajaxSend', incrementAjaxPendingRequests);
  jQuery(document).on('ajaxComplete', decrementAjaxPendingRequests);
}
