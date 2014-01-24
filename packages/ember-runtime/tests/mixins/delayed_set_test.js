var objectWithDelayedProps, objectWithoutDelayedProps;

var wait = function() {
  window.setTimeout(function() {
    if (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop) {
      wait();
      return;
    }
    start();
  }, 10);
};

module("Ember.DelayedSet", {
  setup: function() {
    Ember.run(function() {
      objectWithoutDelayedProps = Ember.Object.createWithMixins(Ember.DelayedSetMixin, {
        nick: 'Huafu',
        age: 30,
        email: 'huafu.gandon@gmail.com'
      });
      objectWithDelayedProps = Ember.Object.createWithMixins(Ember.DelayedSetMixin, {
        delayedProperties: [
          {name: 'nick', delay: 100, type: 'throttle'},
          {name: 'email', delay: 200, type: 'debounce'}
        ],
        nick: 'Huafu',
        email: 'huafu.gandon@gmail.com',
        age: 30
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      objectWithoutDelayedProps.destroy();
      objectWithDelayedProps.destroy();
    });
  }
});

test("Non delayed properties are initially set", function() {
  equal(objectWithoutDelayedProps.get('nick'), 'Huafu', 'nick is set on non-delayed prop');
  equal(objectWithoutDelayedProps.get('age'), 30, 'age is set on non-delayed prop');
  equal(objectWithoutDelayedProps.get('email'), 'huafu.gandon@gmail.com', 'email is set on non-delayed prop');
  equal(objectWithDelayedProps.get('age'), 30, 'age is set on non-delayed prop in object with delayed props');
});

test("Delayed properties aren't initially set", function() {
  equal(objectWithDelayedProps.get('nick'), undefined, 'nick is not initially set on throttled prop');
  equal(objectWithDelayedProps.get('email'), undefined, 'email is not initially set on debounced prop');
});

asyncTest("Delayed properties are set after their respective delay", function() {
  Ember.run.later(function() {
    equal(objectWithDelayedProps.get('nick'), 'Huafu', 'nick is set on throttled prop after right delay + 1');
    equal(objectWithDelayedProps.get('email'), undefined, 'email is not set on debounced prop until the delay is passed');
  }, 101);
  Ember.run.later(function() {
    equal(objectWithDelayedProps.get('nick'), 'Huafu', 'nick is set on throttled prop after longer delay');
    equal(objectWithDelayedProps.get('email'), 'huafu.gandon@gmail.com', 'email is set on debounced prop after right delay + 1');
  }, 201);
  wait();
});

asyncTest("Delayed properties can be cancelled before the delay", function() {
  Ember.run.later(function() {
    objectWithDelayedProps.cancelDelayedProperty('nick');
    equal(objectWithDelayedProps.get('nick'), 'Huafu', 'nick is set on throttled prop after right delay + 1 even if cancel');
    objectWithDelayedProps.cancelDelayedProperty('email');
  }, 101);
  Ember.run.later(function() {
    equal(objectWithDelayedProps.get('email'), undefined, 'email is not set on debounced prop when the delay is passed if cancelled');
  }, 201);
  wait();
});

asyncTest("Delayed properties can be configured later than creation", function() {
  objectWithoutDelayedProps.set('age', 40);
  objectWithoutDelayedProps.set('nick', 'HUAFU');
  equal(objectWithoutDelayedProps.get('age'), 40, 'Non delayed properties are updated directly');
  equal(objectWithoutDelayedProps.get('nick'), 'HUAFU', 'Non delayed properties are updated directly');
  objectWithoutDelayedProps.defineDelayedProperty('age', 100);
  objectWithoutDelayedProps.defineDelayedProperty('nick', 100, 'debounce');
  objectWithoutDelayedProps.set('age', 25);
  objectWithoutDelayedProps.set('nick', 'huafu');
  equal(objectWithoutDelayedProps.get('age'), 40, 'Throttled properties defined after object creation are not set directly');
  equal(objectWithoutDelayedProps.get('nick'), 'HUAFU', 'Debounced properties defined after object creation are not set directly');
  Ember.run.later(function() {
    equal(objectWithoutDelayedProps.get('age'), 25, 'Throttled properties defined after object creation are set correctly after delay');
    equal(objectWithoutDelayedProps.get('nick'), 'huafu', 'Debounced properties defined after object creation are set correctly after delay');
  }, 101);
  wait();
});


asyncTest("Debounced properties aren't set if a new update happened before the delay", function() {
  Ember.run.later(function() {
    equal(objectWithDelayedProps.get('email'), undefined, 'email is not set on debounced prop until the delay is passed');
    objectWithDelayedProps.set('email', 'huafu@sovolve.com');
    equal(objectWithDelayedProps.get('email'), undefined, 'email is not set on debounced prop until the delay is passed');
  }, 101);
  Ember.run.later(function() {
    equal(objectWithDelayedProps.get('email'), undefined, 'email is not set on debounced prop until the delay is passed after an update');
  }, 201);
  Ember.run.later(function() {
    equal(objectWithDelayedProps.get('email'), 'huafu@sovolve.com', 'email is set on debounced prop after right delay + n');
  }, 400);
  wait();
});
