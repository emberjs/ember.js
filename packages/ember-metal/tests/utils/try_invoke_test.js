import { tryInvoke } from 'ember-metal/utils';

var obj;

QUnit.module("Ember.tryInvoke", {
  setup: function() {
    obj = {
      aMethodThatExists: function() { return true; },
      aMethodThatTakesArguments: function(arg1, arg2) { return arg1 === arg2; }
    };
  },

  teardown: function() {
    obj = undefined;
  }
});

QUnit.test("should return undefined when the object doesn't exist", function() {
  equal(tryInvoke(undefined, 'aMethodThatDoesNotExist'), undefined);
});

QUnit.test("should return undefined when asked to perform a method that doesn't exist on the object", function() {
  equal(tryInvoke(obj, 'aMethodThatDoesNotExist'), undefined);
});

QUnit.test("should return what the method returns when asked to perform a method that exists on the object", function() {
  equal(tryInvoke(obj, 'aMethodThatExists'), true);
});

QUnit.test("should return what the method returns when asked to perform a method that takes arguments and exists on the object", function() {
  equal(tryInvoke(obj, 'aMethodThatTakesArguments', [true, true]), true);
});
