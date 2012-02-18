/*global Test:true*/

module("Ember.TargetActionSupport");

test("it should return false if no target or action are specified", function() {
  expect(1);

  var obj = Ember.Object.create(Ember.TargetActionSupport);

  ok(false === obj.triggerAction(), "no target or action was specified");
});

test("it should support actions specified as strings", function() {
  expect(2);

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
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

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
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

  window.Test = {};

  Test.targetObj = Ember.Object.create({
    anEvent: function() {
      ok(true, "anEvent method was called on global object");
    }
  });

  var myObj = Ember.Object.create(Ember.TargetActionSupport, {
    target: 'Test.targetObj',
    action: 'anEvent'
  });

  ok(true === myObj.triggerAction(), "a valid target and action were specified");

  window.Test = undefined;
});
