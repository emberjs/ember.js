import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';

QUnit.module('Ember.View#destroy');

QUnit.test('should teardown viewName on parentView when childView is destroyed', function() {
  let viewName = 'someChildView';
  let parentView = EmberView.create();
  let childView = parentView.createChildView(EmberView, { viewName: viewName });

  equal(get(parentView, viewName), childView, 'Precond - child view was registered on parent');

  run(() => childView.destroy());

  equal(get(parentView, viewName), null, 'viewName reference was removed on parent');

  run(() => parentView.destroy());
});

