module("Ember.Deferred");

test("can resolve deferred", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.Deferred);
  });

  deferred.then(function() {
    count++;
  });

  stop();
  Ember.run(function() {
    deferred.resolve();
  });

  setTimeout(function() {
    start();
    equal(count, 1, "done callback was called");
  }, 20);
});

test("can reject deferred", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.Deferred);
  });

  deferred.then(function() {}, function() {
    count++;
  });

  stop();
  Ember.run(function() {
    deferred.reject();
  });

  setTimeout(function() {
    start();
    equal(count, 1, "fail callback was called");
  }, 20);
});

test("can resolve with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.Deferred);
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
    deferred = Ember.Object.createWithMixins(Ember.Deferred);
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
    deferred = Ember.Object.createWithMixins(Ember.Deferred);
  });

  deferred.then(function() {
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

test("resolve prevent reject", function() {
  var deferred, resolved = false, rejected = false, progress = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.Deferred);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  stop();
  Ember.run(function() {
    deferred.resolve();
  });
  Ember.run(function() {
    deferred.reject();
  });

  setTimeout(function() {
    start();
    equal(resolved, true, "is resolved");
    equal(rejected, false, "is not rejected");
  }, 20);
});

test("reject prevent resolve", function() {
  var deferred, resolved = false, rejected = false, progress = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.Deferred);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  stop();
  Ember.run(function() {
    deferred.reject();
  });
  Ember.run(function() {
    deferred.resolve();
  });

  setTimeout(function() {
    start();
    equal(resolved, false, "is not resolved");
    equal(rejected, true, "is rejected");
  }, 20);
});

test("will call callbacks if they are added after resolution", function() {

  var deferred, count1 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.Deferred);
  });

  stop();
  Ember.run(function() {
    deferred.resolve('toto');
  });

  Ember.run(function() {
    deferred.then(function(context) {
      if (context === 'toto') {
        count1++;
      }
    });

    deferred.then(function(context) {
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
