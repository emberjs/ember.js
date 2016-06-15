import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import EmberView from 'ember-views/views/view';

let view;

QUnit.module('EmberView evented helpers', {
  teardown() {
    run(() => view.destroy());
  }
});

QUnit.test('fire should call method sharing event name if it exists on the view', function() {
  let eventFired = false;

  view = EmberView.create({
    fireMyEvent() {
      this.trigger('myEvent');
    },

    myEvent() {
      eventFired = true;
    }
  });

  run(() => view.fireMyEvent());

  equal(eventFired, true, 'fired the view method sharing the event name');
});

QUnit.test('fire does not require a view method with the same name', function() {
  let eventFired = false;

  view = EmberView.create({
    fireMyEvent() {
      this.trigger('myEvent');
    }
  });

  let listenObject = EmberObject.create({
    onMyEvent() {
      eventFired = true;
    }
  });

  view.on('myEvent', listenObject, 'onMyEvent');

  run(() => view.fireMyEvent());

  equal(eventFired, true, 'fired the event without a view method sharing its name');

  run(() => listenObject.destroy());
});

