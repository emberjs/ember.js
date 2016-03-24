import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { computed } from 'ember-metal/computed';
import EmberView from 'ember-views/views/view';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

import { objectAt } from 'ember-runtime/mixins/array';

var View, view, parentBecameVisible, childBecameVisible, grandchildBecameVisible;
var parentBecameHidden, childBecameHidden, grandchildBecameHidden;
var warnings, originalWarn;
var originalViewKeyword;

QUnit.module('EmberView#isVisible', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
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
      run(function() { view.destroy(); });
    }
    resetKeyword('view', originalViewKeyword);
    setDebugFunction('warn', originalWarn);
  }
});

QUnit.test('should hide views when isVisible is false', function() {
  view = EmberView.create({
    isVisible: false
  });

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), 'the view is hidden');

  run(function() {
    set(view, 'isVisible', true);
  });

  ok(view.$().is(':visible'), 'the view is visible');
  run(function() {
    view.remove();
  });

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('should hide element if isVisible is false before element is created', function() {
  view = EmberView.create({
    isVisible: false
  });

  ok(!get(view, 'isVisible'), 'precond - view is not visible');

  set(view, 'template', function() { return 'foo'; });

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), 'should be hidden');

  run(function() {
    view.remove();
  });

  run(function() {
    set(view, 'isVisible', true);
  });

  run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), 'view should be visible');

  run(function() {
    view.remove();
  });

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('should hide views when isVisible is a CP returning false', function() {
  view = EmberView.extend({
    isVisible: computed(function() {
      return false;
    })
  }).create();

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), 'the view is hidden');

  run(function() {
    set(view, 'isVisible', true);
  });

  ok(view.$().is(':visible'), 'the view is visible');
  run(function() {
    view.remove();
  });

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('doesn\'t overwrite existing style attribute bindings', function() {
  view = EmberView.create({
    isVisible: false,
    attributeBindings: ['style'],
    style: 'color: blue;'
  });

  run(function() {
    view.append();
  });

  equal(view.$().attr('style'), 'color: blue; display: none;', 'has concatenated style attribute');
});
