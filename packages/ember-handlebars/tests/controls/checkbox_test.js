// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = Ember.get, set = Ember.set, checkboxView, dispatcher;

module("Ember.Checkbox", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
  },
  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
      checkboxView.destroy();
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
    checkboxView.appendTo('#qunit-fixture');
  });
}

test("should begin disabled if the disabled attribute is true", function() {
  checkboxView = Ember.Checkbox.create({});

  checkboxView.set('disabled', true);
  append();

  ok(checkboxView.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is changed", function() {
  checkboxView = Ember.Checkbox.create({});

  append();
  ok(checkboxView.$().is(":not(:disabled)"));

  Ember.run(function() { checkboxView.set('disabled', true); });
  ok(checkboxView.$().is(":disabled"));

  Ember.run(function() { checkboxView.set('disabled', false); });
  ok(checkboxView.$().is(":not(:disabled)"));
});

test("checked property mirrors input value", function() {
  checkboxView = Ember.Checkbox.create({});
  Ember.run(function() { checkboxView.append(); });

  equal(get(checkboxView, 'checked'), false, "initially starts with a false value");
  equal(!!checkboxView.$().prop('checked'), false, "the initial checked property is false");

  setAndFlush(checkboxView, 'checked', true);

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  checkboxView.remove();
  Ember.run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  Ember.run(function() { checkboxView.remove(); });
  Ember.run(function() { set(checkboxView, 'checked', false); });
  Ember.run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), false, "changing the value property changes the DOM");
});

test("checking the checkbox updates the value", function() {
  checkboxView = Ember.Checkbox.create({ checked: true });
  Ember.run(function() { checkboxView.appendTo('#qunit-fixture'); });

  equal(get(checkboxView, 'checked'), true, "precond - initially starts with a true value");
  equal(!!checkboxView.$().attr('checked'), true, "precond - the initial checked property is true");

  // Can't find a way to programatically trigger a checkbox in IE and have it generate the
  // same events as if a user actually clicks.
  if (!Ember.$.browser.msie) {
    checkboxView.$()[0].click();
  } else {
    checkboxView.$().trigger('click');
    checkboxView.$().removeAttr('checked').trigger('change');
  }

  equal(checkboxView.$().prop('checked'), false, "after clicking a checkbox, the checked property changed");
  equal(get(checkboxView, 'checked'), false, "changing the checkbox causes the view's value to get updated");
});

// deprecated behaviors
test("wraps the checkbox in a label if a title attribute is provided", function(){
  Ember.TESTING_DEPRECATION = true;

  try {
    checkboxView = Ember.Checkbox.create({ title: "I have a title" });
    append();
    equal(checkboxView.$('label').length, 1);
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }
});

test("proxies the checked attribute to value for backwards compatibility", function(){
  Ember.TESTING_DEPRECATION = true;

  try {
    checkboxView = Ember.Checkbox.create({ title: "I have a title" });
    append();

    set(checkboxView, 'value', true);
    equal(get(checkboxView, 'checked'), true, 'checked is updated when value set');
    equal(get(checkboxView, 'value'), true, 'value is updated when value set');

    set(checkboxView, 'checked', false);

    equal(get(checkboxView, 'checked'), false, 'checked is updated when checked set');
    equal(get(checkboxView, 'value'), false, 'value is updated when checked set');
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }
});

