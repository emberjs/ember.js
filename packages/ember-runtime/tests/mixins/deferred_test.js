module("Ember.Deferred");

test("can resolve deferred", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.create(Ember.Deferred);
  });

  deferred.done(function() {
    count++;
  });

  deferred.always(function() {
    count++;
  });

  equal(deferred.get('isPending'), true, "is pending");

  stop();
  Ember.run(function() {
    deferred.resolve();
  });

  setTimeout(function() {
    start();
    equal(count, 2, "done and always were called");
    equal(deferred.get('isResolved'), true, "is resolved");
  }, 20);
});

test("can reject deferred", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.create(Ember.Deferred);
  });

  deferred.fail(function() {
    count++;
  });

  deferred.always(function() {
    count++;
  });

  stop();
  Ember.run(function() {
    deferred.reject();
  });

  setTimeout(function() {
    start();
    equal(count, 2, "fail and always were called");
    equal(deferred.get('isRejected'), true, "is rejected");
  }, 20);
});

test("can resolve with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.create(Ember.Deferred);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  stop();
  Ember.run(function() {
    deferred.resolve();
  });

  setTimeout(function() {
    start();
    equal(count1, 1, "then were resolved");
    equal(count2, 0, "then was not rejected");
  }, 20);
});

test("can reject with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.create(Ember.Deferred);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  stop();
  Ember.run(function() {
    deferred.reject();
  });

  setTimeout(function() {
    start();
    equal(count1, 0, "then was not resolved");
    equal(count2, 1, "then were rejected");
  }, 20);
});

test("can call resolve multiple times", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.create(Ember.Deferred);
  });

  deferred.done(function() {
    count++;
  });

  stop();
  Ember.run(function() {
    deferred.resolve();
    deferred.resolve();
    deferred.resolve();
  });

  setTimeout(function() {
    start();
    equal(count, 1, "calling resolve multiple times has no effect");
  }, 20);
});

test("deferred has progress", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.create(Ember.Deferred);
  });

  deferred.progress(function() {
    count++;
  });

  stop();
  Ember.run(function() {
    deferred.notify();
    deferred.notify();
    deferred.notify();
    deferred.resolve();
    deferred.notify();
  });

  setTimeout(function() {
    start();
    equal(count, 3, "progress called three times");
  }, 20);
});

test("will call callbacks if they are added after resolution", function() {

  var deferred, count1 = 0;

  Ember.run(function() {
    deferred = Ember.Object.create(Ember.Deferred);
  });

  stop();
  Ember.run(function() {
    deferred.resolve('toto');
  });

  Ember.run(function() {
    deferred.done(function(context) {
      if (context === 'toto') {
        count1++;
      }
    });

    deferred.always(function(context) {
      if (context === 'toto') {
        count1++;
      }
    });
  });

  setTimeout(function() {
    start();
    equal(count1, 2, "callbacks called after resolution");
  }, 20);
});
