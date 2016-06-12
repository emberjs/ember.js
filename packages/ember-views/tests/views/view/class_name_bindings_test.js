import run from 'ember-metal/run_loop';
import { isWatching } from 'ember-metal/watching';
import EmberView from 'ember-views/views/view';

let view;

QUnit.module('EmberView - Class Name Bindings', {
  teardown() {
    run(() => view.destroy());
  }
});

QUnit.skip('classNameBindings lifecycle test', function() {
  run(() => {
    view = EmberView.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });

  equal(isWatching(view, 'priority'), false);

  run(() => view.createElement());

  equal(view.$().attr('class'), 'ember-view high');
  equal(isWatching(view, 'priority'), true);

  run(() => {
    view.remove();
    view.set('priority', 'low');
  });

  equal(isWatching(view, 'priority'), false);
});


