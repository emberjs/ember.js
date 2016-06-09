import { runDestroy } from 'ember-runtime/tests/utils';
import View from 'ember-views/views/view';


var view, parentView;

QUnit.module('ember-views: View#render hook', {
  teardown() {
    runDestroy(view);
    runDestroy(parentView);
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
