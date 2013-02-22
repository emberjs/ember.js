/*global Test:true*/

var originalLookup;

module("Ember.TargetActionSupport", {
  setup: function() {
    originalLookup = Ember.lookup;
  },
  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("it should return false if no target or action are specified", function() {
  expect(1);

  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport);

  ok(false === obj.triggerAction(), "no target or action was specified");
});

test("it should support actions specified as strings", function() {
  expect(2);

  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      anEvent: function() {
        ok(true, "anEvent method was called");
      }
    }),

    action: 'anEvent'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");
});

test("it should invoke the send() method on objects that implement it", function() {
  expect(2);

  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      send: function(evt) {
        equal(evt, 'anEvent', "send() method was invoked with correct event name");
      }
    }),

    action: 'anEvent'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");
});

test("it should find targets specified using a property path", function() {
  expect(2);

  var Test = {};
  Ember.lookup = { Test: Test };

  Test.targetObj = Ember.Object.create({
    anEvent: function() {
      ok(true, "anEvent method was called on global object");
    }
  });

  var myObj = Ember.Object.createWithMixins(Ember.TargetActionSupport, {
    target: 'Test.targetObj',
    action: 'anEvent'
  });

  ok(true === myObj.triggerAction(), "a valid target and action were specified");
});

test("if no target is specified, actions should be sent to the controller", function() {
  expect(2);

  var myObj = Ember.Object.createWithMixins(Ember.TargetActionSupport, {
    controller: {
      send: function(evt) {
        equal(evt, 'anEvent', "send() method was invoked with correct event name");
      }
    },
    action: 'anEvent'
  });

  ok(true === myObj.triggerAction(), "a valid controller and action were specified");
});

test("namespaced targets and actions can be specified", function() {
  expect(2);
  var myObj = Ember.Object.createWithMixins(Ember.TargetActionSupport, {
    controller: {
      anEvent: function() {
        ok(true, "anEvent method was called");
      }
    },
    mouseEnterTarget: 'controller',
    mouseEnterAction: 'anEvent'
  });

  ok(true === myObj.triggerAction('mouseEnter'), "a valid controller and action were specified");
});
