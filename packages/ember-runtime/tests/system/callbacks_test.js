module("Ember.Callbacks");

test("can add and remove callbacks to Ember.Callbacks object", function() {

  var callbacks;

  Ember.run(function() {
    callbacks = Ember.Callbacks.create();
  });

  var fn = function() {};

  Ember.run(function() {
    callbacks.add(fn);
  });

  equal(callbacks.has(fn), true, "callbacks contains fn");

  Ember.run(function() {
    callbacks.remove(fn);
  });

  equal(callbacks.has(fn), false, "callbacks do not contains fn anymore");

  var fn1 = function() {};
  var fn2 = function() {};

  Ember.run(function() {
    callbacks.add([fn1, fn2]);
  });

  equal(callbacks.has(fn1), true, "callbacks contains fn1");
  equal(callbacks.has(fn2), true, "callbacks contains fn2");
});

test("can add only once a fn if Ember.Callbacks is unique", function() {

  var callbacks, count = 0;

  Ember.run(function() {
    callbacks = Ember.Callbacks.create({unique: true});
  });

  var fn = function() { count++; };

  Ember.run(function() {
    callbacks.add(fn);
    callbacks.add(fn);
  });

  equal(callbacks.has(fn), true, "callbacks contains fn");

  stop();
  Ember.run(function() {
    callbacks.fire();
  });

  setTimeout(function() {
    start();
    equal(count, 1, "fn called once");
  }, 20);
});

test("can invoke callbacks in Ember.Callbacks", function() {
  var callbacks, count1 = 0, count2 = 0;

  Ember.run(function() {
    callbacks = Ember.Callbacks.create();
  });

  var fn1 = function() { count1++; };
  var fn2 = function() { count2++; };

  stop();
  Ember.run(function() {
    callbacks.add(fn1);
    callbacks.fire();
    callbacks.add(fn2);
  });

  setTimeout(function() {
    start();
    equal(callbacks.get('fired'), true, "callback was fired");
    equal(count1, 1, "callback fn1 was called");
    equal(count2, 0, "callback fn2 was not called");
  }, 20);
});

test("can invoke callbacks in Ember.Callbacks with memory", function() {
  var callbacks, count1 = 0, count2 = 0;

  Ember.run(function() {
    callbacks = Ember.Callbacks.create({memory: true});
  });

  var fn1 = function() { count1++; };
  var fn2 = function() { count2++; };

  stop();
  Ember.run(function() {
    callbacks.add(fn1);
    callbacks.fire();
    callbacks.add(fn2);
  });

  setTimeout(function() {
    start();
    equal(count1, 1, "callback fn1 was called");
    equal(count2, 1, "callback fn2 was called");
  });
});

test("can invoke callbacks in Ember.Callbacks with once", function() {
  var callbacks, count1 = 0;

  Ember.run(function() {
    callbacks = Ember.Callbacks.create({once: true});
  });

  var fn1 = function() { count1++; };

  stop();
  Ember.run(function() {
    callbacks.add(fn1);
    callbacks.fire();
    callbacks.fire();
    callbacks.add(fn1);
    callbacks.fire();
  });

  setTimeout(function() {
    start();
    equal(count1, 1, "callback fn1 was called");
  });
});

test("can invoke callbacks in Ember.Callbacks with memory and once", function() {
  var callbacks, count1 = 0, count2 = 0;

  Ember.run(function() {
    callbacks = Ember.Callbacks.create({memory: true, once: true});
  });

  var fn1 = function() { count1++; };
  var fn2 = function() { count2++; };

  stop();
  Ember.run(function() {
    callbacks.fire();
    callbacks.add(fn1);
    callbacks.add(fn2);
    callbacks.fire();
  });

  setTimeout(function() {
    start();
    equal(count1, 1, "callback fn1 was called");
    equal(count2, 1, "callback fn2 was called");
  });
});
