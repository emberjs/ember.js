import Ember from "ember-metal/core";
import EmberObject from "ember-runtime/system/object";
import TargetActionSupport from "ember-runtime/mixins/target_action_support";

var originalLookup;

QUnit.module("TargetActionSupport", {
  setup() {
    originalLookup = Ember.lookup;
  },
  teardown() {
    Ember.lookup = originalLookup;
  }
});

QUnit.test("it should return false if no target or action are specified", function() {
  expect(1);

  var obj = EmberObject.extend(TargetActionSupport).create();

  ok(false === obj.triggerAction(), "no target or action was specified");
});

QUnit.test("it should support actions specified as strings", function() {
  expect(2);

  var obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      anEvent() {
        ok(true, "anEvent method was called");
      }
    }),

    action: 'anEvent'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");
});

QUnit.test("it should invoke the send() method on objects that implement it", function() {
  expect(3);

  var obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      send(evt, context) {
        equal(evt, 'anEvent', "send() method was invoked with correct event name");
        equal(context, obj, "send() method was invoked with correct context");
      }
    }),

    action: 'anEvent'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");
});

QUnit.test("it should find targets specified using a property path", function() {
  expect(2);

  var Test = {};
  Ember.lookup = { Test: Test };

  Test.targetObj = EmberObject.create({
    anEvent() {
      ok(true, "anEvent method was called on global object");
    }
  });

  var myObj = EmberObject.extend(TargetActionSupport).create({
    target: 'Test.targetObj',
    action: 'anEvent'
  });

  ok(true === myObj.triggerAction(), "a valid target and action were specified");
});

QUnit.test("it should use an actionContext object specified as a property on the object", function() {
  expect(2);
  var obj = EmberObject.extend(TargetActionSupport).create({
    action: 'anEvent',
    actionContext: {},
    target: EmberObject.create({
      anEvent(ctx) {
        ok(obj.actionContext === ctx, 'anEvent method was called with the expected context');
      }
    })
  });
  ok(true === obj.triggerAction(), 'a valid target and action were specified');
});

QUnit.test("it should find an actionContext specified as a property path", function() {
  expect(2);

  var Test = {};
  Ember.lookup = { Test: Test };
  Test.aContext = {};

  var obj = EmberObject.extend(TargetActionSupport).create({
    action: 'anEvent',
    actionContext: 'Test.aContext',
    target: EmberObject.create({
      anEvent(ctx) {
        ok(Test.aContext === ctx, 'anEvent method was called with the expected context');
      }
    })
  });

  ok(true === obj.triggerAction(), 'a valid target and action were specified');
});

QUnit.test("it should use the target specified in the argument", function() {
  expect(2);
  var targetObj = EmberObject.create({
    anEvent() {
      ok(true, 'anEvent method was called');
    }
  });
  var obj = EmberObject.extend(TargetActionSupport).create({
    action: 'anEvent'
  });

  ok(true === obj.triggerAction({ target: targetObj }), "a valid target and action were specified");
});

QUnit.test("it should use the action specified in the argument", function() {
  expect(2);

  var obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      anEvent() {
        ok(true, "anEvent method was called");
      }
    })
  });
  ok(true === obj.triggerAction({ action: 'anEvent' }), "a valid target and action were specified");
});

QUnit.test("it should use the actionContext specified in the argument", function() {
  expect(2);
  var context = {};
  var obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      anEvent(ctx) {
        ok(context === ctx, "anEvent method was called with the expected context");
      }
    }),
    action: 'anEvent'
  });

  ok(true === obj.triggerAction({ actionContext: context }), "a valid target and action were specified");
});

QUnit.test("it should allow multiple arguments from actionContext", function() {
  expect(3);
  var param1 = 'someParam';
  var param2 = 'someOtherParam';
  var obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      anEvent(first, second) {
        ok(first === param1, "anEvent method was called with the expected first argument");
        ok(second === param2, "anEvent method was called with the expected second argument");
      }
    }),
    action: 'anEvent'
  });

  ok(true === obj.triggerAction({ actionContext: [param1, param2] }), "a valid target and action were specified");
});

QUnit.test("it should use a null value specified in the actionContext argument", function() {
  expect(2);
  var obj = EmberObject.extend(TargetActionSupport).create({
    target: EmberObject.create({
      anEvent(ctx) {
        ok(null === ctx, "anEvent method was called with the expected context (null)");
      }
    }),
    action: 'anEvent'
  });
  ok(true === obj.triggerAction({ actionContext: null }), "a valid target and action were specified");
});
