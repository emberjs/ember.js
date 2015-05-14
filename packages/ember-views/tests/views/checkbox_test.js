import Checkbox from "ember-views/views/checkbox";

import { get } from "ember-metal/property_get";
import { set as o_set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import EventDispatcher from "ember-views/system/event_dispatcher";

function set(obj, key, value) {
  run(function() { o_set(obj, key, value); });
}

function append() {
  run(function() {
    checkboxView.appendTo('#qunit-fixture');
  });
}


var checkboxView, dispatcher;

QUnit.module("Ember.Checkbox", {
  setup() {
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown() {
    run(function() {
      dispatcher.destroy();
      checkboxView.destroy();
    });
  }
});

QUnit.test("should begin disabled if the disabled attribute is true", function() {
  checkboxView = Checkbox.create({});

  checkboxView.set('disabled', true);
  append();

  ok(checkboxView.$().is(":disabled"));
});

QUnit.test("should become disabled if the disabled attribute is changed", function() {
  checkboxView = Checkbox.create({});

  append();
  ok(checkboxView.$().is(":not(:disabled)"));

  run(function() { checkboxView.set('disabled', true); });
  ok(checkboxView.$().is(":disabled"));

  run(function() { checkboxView.set('disabled', false); });
  ok(checkboxView.$().is(":not(:disabled)"));
});

QUnit.test("should begin indeterminate if the indeterminate attribute is true", function() {
  checkboxView = Checkbox.create({});

  checkboxView.set('indeterminate', true);
  append();

  equal(checkboxView.$().prop('indeterminate'), true, "Checkbox should be indeterminate");
});

QUnit.test("should become indeterminate if the indeterminate attribute is changed", function() {
  checkboxView = Checkbox.create({});

  append();

  equal(checkboxView.$().prop('indeterminate'), false, "Checkbox should not be indeterminate");

  run(function() { checkboxView.set('indeterminate', true); });
  equal(checkboxView.$().prop('indeterminate'), true, "Checkbox should be indeterminate");

  run(function() { checkboxView.set('indeterminate', false); });
  equal(checkboxView.$().prop('indeterminate'), false, "Checkbox should not be indeterminate");
});

QUnit.test("should support the tabindex property", function() {
  checkboxView = Checkbox.create({});

  run(function() { checkboxView.set('tabindex', 6); });
  append();

  equal(checkboxView.$().prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');

  run(function() { checkboxView.set('tabindex', 3); });
  equal(checkboxView.$().prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});

QUnit.test("checkbox name is updated when setting name property of view", function() {
  checkboxView = Checkbox.create({});

  run(function() { checkboxView.set('name', 'foo'); });
  append();

  equal(checkboxView.$().attr('name'), "foo", "renders checkbox with the name");

  run(function() { checkboxView.set('name', 'bar'); });

  equal(checkboxView.$().attr('name'), "bar", "updates checkbox after name changes");
});

QUnit.test("checked property mirrors input value", function() {
  checkboxView = Checkbox.create({});
  run(function() { checkboxView.append(); });

  equal(get(checkboxView, 'checked'), false, "initially starts with a false value");
  equal(!!checkboxView.$().prop('checked'), false, "the initial checked property is false");

  set(checkboxView, 'checked', true);

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  run(function() { checkboxView.remove(); });
  run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  run(function() { checkboxView.remove(); });
  run(function() { set(checkboxView, 'checked', false); });
  run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), false, "changing the value property changes the DOM");
});

QUnit.test("checking the checkbox updates the value", function() {
  checkboxView = Checkbox.create({ checked: true });
  append();

  equal(get(checkboxView, 'checked'), true, "precond - initially starts with a true value");
  equal(!!checkboxView.$().prop('checked'), true, "precond - the initial checked property is true");

  // IE fires 'change' event on blur.
  checkboxView.$()[0].focus();
  checkboxView.$()[0].click();
  checkboxView.$()[0].blur();

  equal(!!checkboxView.$().prop('checked'), false, "after clicking a checkbox, the checked property changed");
  equal(get(checkboxView, 'checked'), false, "changing the checkbox causes the view's value to get updated");
});
