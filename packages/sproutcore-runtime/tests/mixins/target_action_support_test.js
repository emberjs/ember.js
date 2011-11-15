module("SC.TargetActionSupport");

test("it should not do anything if no target or action are specified", function() {
  expect(1);

  var obj = SC.Object.create(SC.TargetActionSupport);

  obj.triggerAction();

  ok(true, "no exception was thrown");
});

test("it should support actions specified as strings", function() {
  expect(1);

  var obj = SC.Object.create(SC.TargetActionSupport, {
    target: SC.Object.create({
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

  var obj = SC.Object.create(SC.TargetActionSupport, {
    target: SC.Object.create({
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

  Test.targetObj = SC.Object.create({
    anEvent: function() {
      ok(true, "anEvent method was called on global object");
    }
  });

  var myObj = SC.Object.create(SC.TargetActionSupport, {
    target: 'Test.targetObj',
    action: 'anEvent'
  });

  myObj.triggerAction();

  window.Test = undefined;
});
