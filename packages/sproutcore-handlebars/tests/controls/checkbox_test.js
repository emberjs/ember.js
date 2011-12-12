// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = Ember.get, set = Ember.set, checkboxView, application;

module("Ember.Checkbox", {
  setup: function() {
    application = Ember.Application.create();
  },
  teardown: function() {
    checkboxView.destroy();
    application.destroy();
  }
});

function setAndFlush(view, key, value) {
  Ember.run(function() {
    Ember.set(view, key, value);
  });
}

function append() {
  Ember.run(function() {
    checkboxView.appendTo('#qunit-fixture');
  });
}

test("should become disabled if the disabled attribute is true", function() {
  checkboxView = Ember.Checkbox.create({});

  checkboxView.set('disabled', true);
  append();

  ok(checkboxView.$("input").is(":disabled"));
});

test("should become disabled if the disabled attribute is true", function() {
  checkboxView = Ember.Checkbox.create({});

  append();
  ok(checkboxView.$("input").is(":not(:disabled)"));

  Ember.run(function() { checkboxView.set('disabled', true); });
  ok(checkboxView.$("input").is(":disabled"));

  Ember.run(function() { checkboxView.set('disabled', false); });
  ok(checkboxView.$("input").is(":not(:disabled)"));
});

test("value property mirrors input value", function() {
  checkboxView = Ember.Checkbox.create({});
  Ember.run(function() { checkboxView.append(); });

  equals(get(checkboxView, 'value'), false, "initially starts with a false value");
  equals(!!checkboxView.$('input').prop('checked'), false, "the initial checked property is false");

  setAndFlush(checkboxView, 'value', true);

  equals(checkboxView.$('input').prop('checked'), true, "changing the value property changes the DOM");

  checkboxView.remove();
  Ember.run(function() { checkboxView.append(); });

  equals(checkboxView.$('input').prop('checked'), true, "changing the value property changes the DOM");

  Ember.run(function() { checkboxView.remove(); });
  Ember.run(function() { set(checkboxView, 'value', false); });
  Ember.run(function() { checkboxView.append(); });

  equals(checkboxView.$('input').prop('checked'), false, "changing the value property changes the DOM");
});

test("value property mirrors input value", function() {
  checkboxView = Ember.Checkbox.create({ value: true });
  Ember.run(function() { checkboxView.append(); });

  equals(get(checkboxView, 'value'), true, "precond - initially starts with a true value");
  equals(!!checkboxView.$('input').prop('checked'), true, "the initial checked property is true");

  setAndFlush(checkboxView, 'value', false);

  equals(!!checkboxView.$('input').prop('checked'), false, "changing the value property changes the DOM");

  Ember.run(function() { checkboxView.remove(); });
  Ember.run(function() { checkboxView.append(); });

  equals(checkboxView.$('input').prop('checked'), false, "changing the value property changes the DOM");

  Ember.run(function() { checkboxView.remove(); });
  setAndFlush(checkboxView, 'value', true);
  Ember.run(function() { checkboxView.append(); });

  equals(checkboxView.$('input').prop('checked'), true, "changing the value property changes the DOM");
});

test("checking the checkbox updates the value", function() {
  checkboxView = Ember.Checkbox.create({ value: true });
  Ember.run(function() { checkboxView.appendTo('#qunit-fixture'); });

  equals(get(checkboxView, 'value'), true, "precond - initially starts with a true value");
  equals(!!checkboxView.$('input').attr('checked'), true, "precond - the initial checked property is true");

  // Can't find a way to programatically trigger a checkbox in IE and have it generate the
  // same events as if a user actually clicks.
  if (!jQuery.browser.msie) {
    checkboxView.$('input')[0].click();
  } else {
    checkboxView.$('input').trigger('click');
    checkboxView.$('input').removeAttr('checked').trigger('change');
  }

  equals(checkboxView.$('input').prop('checked'), false, "after clicking a checkbox, the checked property changed");
  equals(get(checkboxView, 'value'), false, "changing the checkbox causes the view's value to get updated");
});

