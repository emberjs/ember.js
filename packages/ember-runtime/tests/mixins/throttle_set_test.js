var objectWithThrottledProps, objectWithoutThrottledProps;

var wait = function() {
  window.setTimeout(function() {
    if (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop) {
      wait();

      return;
    }

    start();
  }, 10);
};

module("Ember.ThrottleSet");

module("Ember.ThrottleSet basic", {
  setup: function() {
    Ember.run(function() {
      objectWithoutThrottledProps = Ember.Object.createWithMixins(Ember.ThrottleSetMixin, {
        nick: 'Huafu',
        age: 30,
        email: 'huafu.gandon@gmail.com'
      });
      objectWithThrottledProps = Ember.Object.createWithMixins(Ember.ThrottleSetMixin, {
        throttledProperties: [
          {name: 'nick', delay: 100},
          {name: 'email', delay: 200}
        ],
        nick: 'Huafu',
        email: 'huafu.gandon@gmail.com',
        age: 30
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      objectWithoutThrottledProps.destroy();
      objectWithThrottledProps.destroy();
    });
  }
});

test("Non throttled properties are initially set", function() {
  equal(objectWithoutThrottledProps.get('nick'), 'Huafu', 'nick is set on non-throttled prop');
  equal(objectWithoutThrottledProps.get('age'), 30, 'age is set on non-throttled prop');
  equal(objectWithoutThrottledProps.get('email'), 'huafu.gandon@gmail.com', 'email is set on non-throttled prop');
  equal(objectWithThrottledProps.get('age'), 30, 'age is set on non-throttled prop in object with throttled prop');
});

test("Throttled properties aren't initially set", function() {
  equal(objectWithThrottledProps.get('nick'), undefined, 'nick is not set on throttled prop');
  equal(objectWithThrottledProps.get('email'), undefined, 'email is not set on throttled prop');
});

asyncTest("Throttled properties are set after their respective delay", function() {
  Ember.run.later(function() {
    equal(objectWithThrottledProps.get('nick'), 'Huafu', 'nick is set on throttled prop after right delay + 1');
    equal(objectWithThrottledProps.get('email'), undefined, 'email is not set on throttled prop until the delay is passed');
  }, 101);
  Ember.run.later(function() {
    equal(objectWithThrottledProps.get('nick'), 'Huafu', 'nick is set on throttled prop after longer delay');
    equal(objectWithThrottledProps.get('email'), 'huafu.gandon@gmail.com', 'email is set on throttled prop after right delay + 1');
  }, 201);
  wait();
});

asyncTest("Throttled properties aren't set if a new update happened before the delay", function() {
  Ember.run.later(function() {
    equal(objectWithThrottledProps.get('nick'), 'Huafu', 'nick is set on throttled prop after right delay + 1');
    equal(objectWithThrottledProps.get('email'), undefined, 'email is not set on throttled prop until the delay is passed');
    objectWithThrottledProps.set('email', 'huafu@sovolve.com');
    equal(objectWithThrottledProps.get('email'), undefined, 'email is not set on throttled prop until the delay is passed');
  }, 101);
  Ember.run.later(function() {
    equal(objectWithThrottledProps.get('email'), undefined, 'email is not set on throttled prop until the delay is passed after an update');
  }, 201);
  Ember.run.later(function() {
    equal(objectWithThrottledProps.get('email'), 'huafu@sovolve.com', 'email is set on throttled prop after right delay + n');
  }, 400);
  wait();
});

asyncTest("Throttled properties can be cancelled before the delay", function() {
  Ember.run.later(function() {
    objectWithThrottledProps.cancelThrottledProperty('nick');
    equal(objectWithThrottledProps.get('nick'), 'Huafu', 'nick is set on throttled prop after right delay + 1 even if cancel');
    objectWithThrottledProps.cancelThrottledProperty('email');
  }, 101);
  Ember.run.later(function() {
    equal(objectWithThrottledProps.get('email'), undefined, 'email is not set on throttled prop when the delay is passed if cancelled');
  }, 201);
  wait();
});

asyncTest("Throttled properties can be defined later", function() {
  objectWithoutThrottledProps.set('age', 40);
  equal(objectWithoutThrottledProps.get('age'), 40, 'Non throttled properties are updated directly');
  objectWithoutThrottledProps.defineThrottledProperty('age', 100);
  objectWithoutThrottledProps.set('age', 25);
  equal(objectWithoutThrottledProps.get('age'), 40, 'Throttled properties defined after object creation are not set directly');
  Ember.run.later(function() {
    equal(objectWithoutThrottledProps.get('age'), 25, 'Throttled properties defined after object creation are set correctly after delay');
  }, 101);
  wait();
});
