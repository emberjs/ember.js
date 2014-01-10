/*global Test:true*/
var originalFlag, originalWarn, warnings;

module("Ember.TargetActionSupport");

module("Backported action via send", {
  setup: function() {
    originalFlag = Ember.ENV.ACTION_VIA_SEND;
    originalWarn = Ember.Logger.warn;
    warnings = [];

    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };
  },

  teardown: function() {
    Ember.ENV.ACTION_VIA_SEND = originalFlag;
    Ember.Logger.warn = originalWarn;
  }
});

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

test("on null level, it should invoke the send() method on objects that implement it", function() {
  Ember.ENV.ACTION_VIA_SEND = null;

  expect(3);

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      send: function(evt) {
        equal(evt, 'anEvent', "send() method was invoked with correct event name");
      }
    }),

    action: 'anEvent'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");
  equal(warnings.length, 0);
});

test("on warn level, it should invoke the send() method and warn", function() {
  Ember.ENV.ACTION_VIA_SEND = 'warn';

  expect(3);

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      send: function(evt) {
        equal(evt, 'anEvent', "send() method was invoked with correct event name");
      }
    }),

    action: 'anEvent'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");

  equal(warnings.length, 1);
});

test("on 1.0 level, it should invoke the send() method and warn", function() {
  Ember.ENV.ACTION_VIA_SEND = '1.0';

  expect(3);

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      send: function(evt) {
        throw new Error("send() method should not be invoked");
      },
      anAction: function () {
        ok(true, "correct method was invoked");
      }
    }),

    action: 'anAction'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");

  equal(warnings.length, 0);
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
