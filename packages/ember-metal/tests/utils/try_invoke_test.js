var obj;

module("Ember.tryInvoke", {
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

test("should return undefined when the object doesn't exist", function() {
  equal(Ember.tryInvoke(undefined, 'aMethodThatDoesNotExist'), undefined);
});

test("should return undefined when asked to perform a method that doesn't exist on the object", function() {
  equal(Ember.tryInvoke(obj, 'aMethodThatDoesNotExist'), undefined);
});

test("should return what the method returns when asked to perform a method that exists on the object", function() {
  equal(Ember.tryInvoke(obj, 'aMethodThatExists'), true);
});

test("should return what the method returns when asked to perform a method that takes arguments and exists on the object", function() {
  equal(Ember.tryInvoke(obj, 'aMethodThatTakesArguments', [true, true]), true);
});
