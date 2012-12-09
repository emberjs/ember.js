var view, dispatcher;

// Adapted from https://github.com/jquery/jquery/blob/f30f7732e7775b6e417c4c22ced7adb2bf76bf89/test/data/testinit.js
var fireNativeWithDataTransfer;
if (document.createEvent) {
  fireNativeWithDataTransfer = function(node, type, dataTransfer) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(type, true, true);
    event.dataTransfer = dataTransfer;
    node.dispatchEvent(event);
  };
} else {
  fireNativeWithDataTransfer = function(node, type, dataTransfer) {
    var event = document.createEventObject();
    event.dataTransfer = dataTransfer;
    node.fireEvent('on' + type, event);
  };
}

module("Ember.EventDispatcher", {
  setup: function() {
    Ember.run(function() {
      dispatcher = Ember.EventDispatcher.create();
      dispatcher.setup();
    });
  },

  teardown: function() {
    Ember.run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
  }
});

test("jQuery.event.fix copies over the dataTransfer property", function() {
  var originalEvent;
  var receivedEvent;

  originalEvent = {
    type: 'drop',
    dataTransfer: 'success',
    target: document.body
  };

  receivedEvent = Ember.$.event.fix(originalEvent);

  ok(receivedEvent !== originalEvent, "attributes are copied to a new event object");
  equal(receivedEvent.dataTransfer, originalEvent.dataTransfer, "copies dataTransfer property to jQuery event");
});

test("drop handler should receive event with dataTransfer property", function() {
  var receivedEvent;
  var dropCalled = 0;

  view = Ember.View.createWithMixins({
    render: function(buffer) {
      buffer.push('please drop stuff on me');
      this._super(buffer);
    },

    drop: function(evt) {
      receivedEvent = evt;
      dropCalled++;
    }
  });

  Ember.run(function() {
    view.append();
  });

  fireNativeWithDataTransfer(view.$().get(0), 'drop', 'success');

  equal(dropCalled, 1, "called drop handler once");
  equal(receivedEvent.dataTransfer, 'success', "copies dataTransfer property to jQuery event");
});
