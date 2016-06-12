import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { computed } from 'ember-metal/computed';
import EmberView from 'ember-views/views/view';

let view;
let warnings, originalWarn;

QUnit.module('EmberView#isVisible', {
  setup() {
    warnings = [];
    originalWarn = getDebugFunction('warn');
    setDebugFunction('warn', function(message, test) {
      if (!test) {
        warnings.push(message);
      }
    });
  },

  teardown() {
    if (view) {
      run(() => view.destroy());
    }
    setDebugFunction('warn', originalWarn);
  }
});

QUnit.test('should hide views when isVisible is false', function() {
  view = EmberView.create({
    isVisible: false
  });

  run(() => view.append());

  ok(view.$().is(':hidden'), 'the view is hidden');

  run(() => set(view, 'isVisible', true));

  ok(view.$().is(':visible'), 'the view is visible');
  run(() => view.remove());

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('should hide element if isVisible is false before element is created', function() {
  view = EmberView.create({
    isVisible: false
  });

  ok(!get(view, 'isVisible'), 'precond - view is not visible');

  set(view, 'template', () => 'foo');

  run(() => view.append());

  ok(view.$().is(':hidden'), 'should be hidden');

  run(() => view.remove());

  run(() => set(view, 'isVisible', true));

  run(() => view.append());

  ok(view.$().is(':visible'), 'view should be visible');

  run(() => view.remove());

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('should hide views when isVisible is a CP returning false', function() {
  view = EmberView.extend({
    isVisible: computed(function() {
      return false;
    })
  }).create();

  run(() => view.append());

  ok(view.$().is(':hidden'), 'the view is hidden');

  run(() => set(view, 'isVisible', true));

  ok(view.$().is(':visible'), 'the view is visible');
  run(() => view.remove());

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('doesn\'t overwrite existing style attribute bindings', function() {
  view = EmberView.create({
    isVisible: false,
    attributeBindings: ['style'],
    style: 'color: blue;'
  });

  run(() => view.append());

  equal(view.$().attr('style'), 'color: blue; display: none;', 'has concatenated style attribute');
});
