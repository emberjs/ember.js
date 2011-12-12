module("Ember.TargetActionSupport");

test("it should not do anything if no target or action are specified", function() {
  expect(1);

  var obj = Ember.Object.create(Ember.TargetActionSupport);

  obj.triggerAction();

  ok(true, "no exception was thrown");
});

test("it should support actions specified as strings", function() {
  expect(1);

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      anEvent: function() {
        ok(true, "anEvent method was called");
      }
    }),

    action: 'anEvent'
  });

  obj.triggerAction();
});

test("it should invoke the send() method on objects that implement it", function() {
  expect(1);

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      send: function(evt) {
        equals(evt, 'anEvent', "send() method was invoked with correct event name");
      }
    }),

    action: 'anEvent'
  });

  obj.triggerAction();
});

test("it should find targets specified using a property path", function() {
  expect(1);

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

  myObj.triggerAction();

  window.Test = undefined;
});
