import { runDestroy } from 'ember-runtime/tests/utils';
import View from 'ember-views/views/view';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var view, parentView, originalViewKeyword;

QUnit.module('ember-views: View#render hook', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    runDestroy(view);
    runDestroy(parentView);
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('the render hook triggers an assertion', function(assert) {
  expectAssertion(() => {
    view = View.create({
      render: function(buffer) {
        buffer.push('<span>Nancy</span>');
      }
    });
  }, 'Using a custom `.render` function is no longer supported.');
});
