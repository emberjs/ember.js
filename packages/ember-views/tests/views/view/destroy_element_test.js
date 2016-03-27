import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

import { objectAt } from 'ember-runtime/mixins/array';

var originalViewKeyword;
var view;

QUnit.module('EmberView#destroyElement', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    run(function() {
      view.destroy();
    });
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('if it has no element, does nothing', function() {
  var callCount = 0;
  view = EmberView.create({
    willDestroyElement() { callCount++; }
  });

  ok(!get(view, 'element'), 'precond - does NOT have element');

  run(function() {
    view.destroyElement();
  });

  equal(callCount, 0, 'did not invoke callback');
});

QUnit.test('returns receiver', function() {
  var ret;
  view = EmberView.create();

  run(function() {
    view.createElement();
    ret = view.destroyElement();
  });

  equal(ret, view, 'returns receiver');
});

QUnit.test('removes element from parentNode if in DOM', function() {
  view = EmberView.create();

  run(function() {
    view.append();
  });

  var parent = view.$().parent();

  ok(get(view, 'element'), 'precond - has element');

  run(function() {
    view.destroyElement();
  });

  equal(view.$(), undefined, 'view has no selector');
  ok(!parent.find('#' + view.get('elementId')).length, 'element no longer in parent node');
});
