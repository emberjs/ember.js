import run from 'ember-metal/run_loop';
import { isWatching } from 'ember-metal/watching';
import EmberView from 'ember-views/views/view';

var view;

QUnit.module('EmberView - Class Name Bindings', {
  teardown() {
    run(function() {
      view.destroy();
    });
  }
});

QUnit.skip('classNameBindings lifecycle test', function() {
  run(function() {
    view = EmberView.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });

  equal(isWatching(view, 'priority'), false);

  run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view high');
  equal(isWatching(view, 'priority'), true);

  run(function() {
    view.remove();
    view.set('priority', 'low');
  });

  equal(isWatching(view, 'priority'), false);
});


