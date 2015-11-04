import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;
var originalViewKeyword;

QUnit.module('EmberView - Nested View Ordering', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    owner = buildOwner();
  },
  teardown() {
    run(function() {
      if (view) { view.destroy(); }
      owner.destroy();
    });
    resetKeyword('view', originalViewKeyword);
    owner = view = null;
  }
});

QUnit.test('should call didInsertElement on child views before parent', function() {
  var insertedLast;

  view = EmberView.create({
    [OWNER]: owner,
    didInsertElement() {
      insertedLast = 'outer';
    },
    template: compile('{{view "inner"}}')
  });

  owner.register('view:inner', EmberView.extend({
    didInsertElement() {
      insertedLast = 'inner';
    }
  }));

  run(function() {
    view.append();
  });

  equal(insertedLast, 'outer', 'didInsertElement called on outer view after inner view');
});
