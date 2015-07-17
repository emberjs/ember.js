import run from 'ember-metal/run_loop';
import View from 'ember-views/views/view';
import { compile } from 'ember-template-compiler';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var originalViewKeyword;

QUnit.module('Ember.View additions to run queue', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('View hierarchy is done rendering to DOM when functions queued in afterRender execute', function() {
  var didInsert = 0;
  var childView = View.create({
    elementId: 'child_view',
    didInsertElement() {
      didInsert++;
    }
  });
  var parentView = View.create({
    elementId: 'parent_view',
    template: compile('{{view view.childView}}'),
    childView: childView,
    didInsertElement() {
      didInsert++;
    }
  });

  run(function() {
    parentView.appendTo('#qunit-fixture');
    run.schedule('afterRender', this, function() {
      equal(didInsert, 2, 'all didInsertElement hooks fired for hierarchy');
    });
  });

  run(function() {
    parentView.destroy();
  });
});
