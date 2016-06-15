import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';

let view;

QUnit.module('EmberView#destroyElement', {
  teardown() {
    run(() => view.destroy());
  }
});

QUnit.test('if it has no element, does nothing', function() {
  let callCount = 0;
  view = EmberView.create({
    willDestroyElement() { callCount++; }
  });

  ok(!get(view, 'element'), 'precond - does NOT have element');

  run(() => view.destroyElement());

  equal(callCount, 0, 'did not invoke callback');
});

QUnit.test('returns receiver', function() {
  let ret;
  view = EmberView.create();

  run(() => {
    view.createElement();
    ret = view.destroyElement();
  });

  equal(ret, view, 'returns receiver');
});

QUnit.test('removes element from parentNode if in DOM', function() {
  view = EmberView.create();

  run(() => view.append());

  let parent = view.$().parent();

  ok(get(view, 'element'), 'precond - has element');

  run(() => view.destroyElement());

  equal(view.$(), undefined, 'view has no selector');
  ok(!parent.find('#' + view.get('elementId')).length, 'element no longer in parent node');
});
