// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = Ember.get, set = Ember.set, formView, application;

module("Ember.Form", {
  setup: function() {
    application = Ember.Application.create();
    formView = Ember.Form.create({});
    append();
  },
  teardown: function() {
    formView.destroy();
    application.destroy();
  }
});

function append() {
  Ember.run(function() {
    formView.appendTo('#qunit-fixture');
  });
}

test("should call the submitForm method when the form is submitted", function() {
  var wasCalled;

  formView.submitForm = function() {
    wasCalled = true;
  };

  formView.$().trigger("submit");
  ok(wasCalled, "invokes submitForm method");
});
