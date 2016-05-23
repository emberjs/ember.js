import EmberView from 'ember-views/views/view';
import run from 'ember-metal/run_loop';
import { compile } from '../utils/helpers';

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

function canSetFalsyMaxLength() {
  var input = document.createElement('input');
  input.maxLength = 0;

  return input.maxLength === 0;
}

QUnit.module('ember-htmlbars: property', {
  teardown() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

QUnit.test('maxlength sets the property and attribute', function() {
  view = EmberView.create({
    context: { length: 5 },
    template: compile('<input maxlength={{length}}>')
  });

  appendView(view);
  equal(view.element.firstChild.maxLength, 5);

  run(view, view.set, 'context.length', 1);
  equal(view.element.firstChild.maxLength, 1);
});

QUnit.test('quoted maxlength sets the attribute and is reflected as a property', function() {
  view = EmberView.create({
    context: { length: 5 },
    template: compile('<input maxlength=\'{{length}}\'>')
  });

  appendView(view);
  equal(view.element.firstChild.maxLength, '5');

  if (canSetFalsyMaxLength()) {
    run(view, view.set, 'context.length', null);
    equal(view.element.firstChild.maxLength, document.createElement('input').maxLength);
  } else {
    run(view, view.set, 'context.length', 1);
    equal(view.element.firstChild.maxLength, 1);
  }
});

QUnit.test('array value can be set as property', function() {
  view = EmberView.create({
    context: {},
    template: compile('<input value={{items}}>')
  });

  appendView(view);

  run(view, view.set, 'context.items', [4, 5]);
  ok(true, 'no legacy assertion prohibited setting an array');
});
