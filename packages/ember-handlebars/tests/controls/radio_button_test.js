// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = Ember.get, set = Ember.set, radioButtonView, application;

module("Ember.RadioButton", {
  setup: function() {
    application = Ember.Application.create();
  },
  teardown: function() {
    Ember.run(function() {
      radioButtonView.destroy();
      application.destroy();
    });
  }
});

function setAndFlush(view, key, value) {
  Ember.run(function() {
    Ember.set(view, key, value);
  });
}

function append() {
  Ember.run(function() {
    radioButtonView.appendTo('#qunit-fixture');
  });
}

test("should begin disabled if the disabled attribute is true", function() {
  radioButtonView = Ember.RadioButton.create({});

  radioButtonView.set('disabled', true);
  append();

  ok(radioButtonView.$("input").is(":disabled"));
});

test("should become disabled if the disabled attribute is changed", function() {
  radioButtonView = Ember.RadioButton.create({});

  append();
  ok(radioButtonView.$("input").is(":not(:disabled)"));

  Ember.run(function() { radioButtonView.set('disabled', true); });
  ok(radioButtonView.$("input").is(":disabled"));

  Ember.run(function() { radioButtonView.set('disabled', false); });
  ok(radioButtonView.$("input").is(":not(:disabled)"));
});

test("value property mirrors input value", function() {
  radioButtonView = Ember.RadioButton.create({ value: "value"});
  Ember.run(function() { radioButtonView.append(); });

  equals(get(radioButtonView, 'value'), "value", "initially starts with a string value");
  equals(!!radioButtonView.$('input').prop('checked'), false, "the initial checked property is false");

  setAndFlush(radioButtonView, 'checked', true);

  equals(radioButtonView.$('input').prop('checked'), true, "changing the value property changes the DOM");

  radioButtonView.remove();
  Ember.run(function() { radioButtonView.append(); });

  equals(radioButtonView.$('input').prop('checked'), true, "changing the value property changes the DOM");

  Ember.run(function() { radioButtonView.remove(); });
  Ember.run(function() { set(radioButtonView, 'checked', false); });
  Ember.run(function() { radioButtonView.append(); });

  equals(radioButtonView.$('input').prop('checked'), false, "changing the value property changes the DOM");
});

test("checking the radiobutton updates the value", function() {
  radioButtonView = Ember.RadioButton.create({ value: "testing" });
  Ember.run(function() { radioButtonView.appendTo('#qunit-fixture'); });

  equals(!!radioButtonView.$('input').attr('checked'), false, "precond - the initial checked property is false");

  // Can't find a way to programatically trigger a radiobutton in IE and have it generate the
  // same events as if a user actually clicks.
  if (!jQuery.browser.msie) {
    radioButtonView.$('input')[0].click();
  } else {
    radioButtonView.$('input').trigger('click');
    radioButtonView.$('input').removeAttr('checked').trigger('change');
  }

  equals(radioButtonView.$('input').prop('checked'), true, "after clicking a radiobutton, the checked property changed");
  
});

