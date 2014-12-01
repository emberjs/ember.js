import Checkbox from 'ember-views/views/checkbox';

import { get } from 'ember-metal/property_get';
import { set as o_set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import EventDispatcher from 'ember-views/system/event_dispatcher';

function set(obj, key, value) {
  run(function() { o_set(obj, key, value); });
}

function append() {
  run(function() {
    checkboxComponent.appendTo('#qunit-fixture');
  });
}

var checkboxComponent, dispatcher;

QUnit.module('Ember.Checkbox', {
  setup() {
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown() {
    run(function() {
      dispatcher.destroy();
      checkboxComponent.destroy();
    });
  }
});

QUnit.test('should begin disabled if the disabled attribute is true', function() {
  checkboxComponent = Checkbox.create({});

  checkboxComponent.set('disabled', true);
  append();

  ok(checkboxComponent.$().is(':disabled'));
});

QUnit.test('should become disabled if the disabled attribute is changed', function() {
  checkboxComponent = Checkbox.create({});

  append();
  ok(checkboxComponent.$().is(':not(:disabled)'));

  run(function() { checkboxComponent.set('disabled', true); });
  ok(checkboxComponent.$().is(':disabled'));

  run(function() { checkboxComponent.set('disabled', false); });
  ok(checkboxComponent.$().is(':not(:disabled)'));
});

QUnit.test('should begin indeterminate if the indeterminate attribute is true', function() {
  checkboxComponent = Checkbox.create({});

  checkboxComponent.set('indeterminate', true);
  append();

  equal(checkboxComponent.$().prop('indeterminate'), true, 'Checkbox should be indeterminate');
});

QUnit.test('should become indeterminate if the indeterminate attribute is changed', function() {
  checkboxComponent = Checkbox.create({});

  append();

  equal(checkboxComponent.$().prop('indeterminate'), false, 'Checkbox should not be indeterminate');

  run(function() { checkboxComponent.set('indeterminate', true); });
  equal(checkboxComponent.$().prop('indeterminate'), true, 'Checkbox should be indeterminate');

  run(function() { checkboxComponent.set('indeterminate', false); });
  equal(checkboxComponent.$().prop('indeterminate'), false, 'Checkbox should not be indeterminate');
});

QUnit.test('should support the tabindex property', function() {
  checkboxComponent = Checkbox.create({});

  run(function() { checkboxComponent.set('tabindex', 6); });
  append();

  equal(checkboxComponent.$().prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');

  run(function() { checkboxComponent.set('tabindex', 3); });
  equal(checkboxComponent.$().prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the component');
});

QUnit.test('checkbox name is updated when setting name property of view', function() {
  checkboxComponent = Checkbox.create({});

  run(function() { checkboxComponent.set('name', 'foo'); });
  append();

  equal(checkboxComponent.$().attr('name'), 'foo', 'renders checkbox with the name');

  run(function() { checkboxComponent.set('name', 'bar'); });

  equal(checkboxComponent.$().attr('name'), 'bar', 'updates checkbox after name changes');
});

QUnit.test('checked property mirrors input value', function() {
  checkboxComponent = Checkbox.create({});
  run(function() { checkboxComponent.append(); });

  equal(get(checkboxComponent, 'checked'), false, 'initially starts with a false value');
  equal(!!checkboxComponent.$().prop('checked'), false, 'the initial checked property is false');

  set(checkboxComponent, 'checked', true);

  equal(checkboxComponent.$().prop('checked'), true, 'changing the value property changes the DOM');

  run(function() { checkboxComponent.remove(); });
  run(function() { checkboxComponent.append(); });

  equal(checkboxComponent.$().prop('checked'), true, 'changing the value property changes the DOM');

  run(function() { checkboxComponent.remove(); });
  run(function() { set(checkboxComponent, 'checked', false); });
  run(function() { checkboxComponent.append(); });

  equal(checkboxComponent.$().prop('checked'), false, 'changing the value property changes the DOM');
});

QUnit.test('checking the checkbox updates the value', function() {
  checkboxComponent = Checkbox.create({ checked: true });
  append();

  equal(get(checkboxComponent, 'checked'), true, 'precond - initially starts with a true value');
  equal(!!checkboxComponent.$().prop('checked'), true, 'precond - the initial checked property is true');

  // IE fires 'change' event on blur.
  checkboxComponent.$()[0].focus();
  checkboxComponent.$()[0].click();
  checkboxComponent.$()[0].blur();

  equal(!!checkboxComponent.$().prop('checked'), false, 'after clicking a checkbox, the checked property changed');
  equal(get(checkboxComponent, 'checked'), false, 'changing the checkbox causes the view\'s value to get updated');
});

test("checking the checkbox updates indeterminate", function() {
  checkboxView = Checkbox.create({ checked: false, indeterminate: true });
  append();

  equal(get(checkboxView, 'indeterminate'), true, "precond - initially starts with a indeterminate value");
  equal(!!checkboxView.$().prop('indeterminate'), true, "precond - the initial indeterminate property is true");

  // IE fires 'change' event on blur.
  checkboxView.$()[0].focus();
  checkboxView.$()[0].click();
  checkboxView.$()[0].blur();

  equal(!!checkboxView.$().prop('indeterminate'), false, "after clicking a checkbox, the indeterminate property changed");
  equal(get(checkboxView, 'indeterminate'), false, "changing the checkbox causes the view's value to get updated");
});
