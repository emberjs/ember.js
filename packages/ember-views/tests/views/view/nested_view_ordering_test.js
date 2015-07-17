import Registry from 'container/registry';
import run from 'ember-metal/run_loop';

import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var registry, container, view;
var originalViewKeyword;

QUnit.module('EmberView - Nested View Ordering', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    registry = new Registry();
    container = registry.container();
  },
  teardown() {
    run(function() {
      if (view) { view.destroy(); }
      container.destroy();
    });
    resetKeyword('view', originalViewKeyword);
    registry = container = view = null;
  }
});

QUnit.test('should call didInsertElement on child views before parent', function() {
  var insertedLast;

  view = EmberView.create({
    didInsertElement() {
      insertedLast = 'outer';
    },
    container: container,
    template: compile('{{view "inner"}}')
  });

  registry.register('view:inner', EmberView.extend({
    didInsertElement() {
      insertedLast = 'inner';
    }
  }));

  run(function() {
    view.append();
  });

  equal(insertedLast, 'outer', 'didInsertElement called on outer view after inner view');
});
