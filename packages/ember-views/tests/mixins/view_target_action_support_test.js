/*global Test:true*/

var originalLookup;

module("Ember.ViewTargetActionSupport", {
  setup: function() {
    originalLookup = Ember.lookup;
  },
  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("it should return false if no action is specified", function() {
  expect(1);

  var view = Ember.View.createWithMixins(Ember.ViewTargetActionSupport, {
    controller: Ember.Object.create()
  });

  ok(false === view.triggerAction(), "a valid target and action were specified");
});

test("it should support actions specified as strings", function() {
  expect(2);

  var view = Ember.View.createWithMixins(Ember.ViewTargetActionSupport, {
    controller: Ember.Object.create({
      anEvent: function() {
        ok(true, "anEvent method was called");
      }
    }),
    action: 'anEvent'
  });

  ok(true === view.triggerAction(), "a valid target and action were specified");
});

test("it should invoke the send() method on the controller with the view's context", function() {
  expect(3);

  var view = Ember.View.createWithMixins(Ember.ViewTargetActionSupport, {
    context: {},
    controller: Ember.Object.create({
      send: function(evt, context) {
        equal(evt, 'anEvent', "send() method was invoked with correct event name");
        equal(context, view.context, "send() method was invoked with correct context");
      }
    }),
    action: 'anEvent'
  });

  ok(true === view.triggerAction(), "a valid target and action were specified");
});
