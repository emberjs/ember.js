import run from 'ember-metal/run_loop';
import EventDispatcher from 'ember-views/system/event_dispatcher';
import jQuery from 'ember-views/system/jquery';
import View from 'ember-views/views/view';

var view, dispatcher;

// Adapted from https://github.com/jquery/jquery/blob/f30f7732e7775b6e417c4c22ced7adb2bf76bf89/test/data/testinit.js
var canDataTransfer, fireNativeWithDataTransfer;

if (document.createEvent) {
  canDataTransfer = !!document.createEvent('HTMLEvents').dataTransfer;
  fireNativeWithDataTransfer = function(node, type, dataTransfer) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(type, true, true);
    event.dataTransfer = dataTransfer;
    node.dispatchEvent(event);
  };
} else {
  canDataTransfer = !!document.createEventObject().dataTransfer;
  fireNativeWithDataTransfer = function(node, type, dataTransfer) {
    var event = document.createEventObject();
    event.dataTransfer = dataTransfer;
    node.fireEvent('on' + type, event);
  };
}

QUnit.module('EventDispatcher - jQuery integration', {
  setup() {
    run(function() {
      dispatcher = EventDispatcher.create();
      dispatcher.setup();
    });
  },

  teardown() {
    run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
  }
});

if (canDataTransfer) {
  QUnit.test('jQuery.event.fix copies over the dataTransfer property', function() {
    var originalEvent;
    var receivedEvent;

    originalEvent = {
      type: 'drop',
      dataTransfer: 'success',
      target: document.body
    };

    receivedEvent = jQuery.event.fix(originalEvent);

    ok(receivedEvent !== originalEvent, 'attributes are copied to a new event object');
    equal(receivedEvent.dataTransfer, originalEvent.dataTransfer, 'copies dataTransfer property to jQuery event');
  });

  QUnit.test('drop handler should receive event with dataTransfer property', function() {
    var receivedEvent;
    var dropCalled = 0;

    view = View.extend({
      drop(evt) {
        receivedEvent = evt;
        dropCalled++;
      }
    }).create();

    run(function() {
      view.append();
    });

    fireNativeWithDataTransfer(view.$().get(0), 'drop', 'success');

    equal(dropCalled, 1, 'called drop handler once');
    equal(receivedEvent.dataTransfer, 'success', 'copies dataTransfer property to jQuery event');
  });
}
