module("Ember.DeferredMixin");

test("can resolve deferred", function() {
  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function(a) {
    count++;
  });

  Ember.run(function() {
    deferred.resolve();
  });

  equal(count, 1, "was fulfilled");
});

test("can reject deferred", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {}, function() {
    count++;
  });

  Ember.run(function() {
    deferred.reject();
  });

  equal(count, 1, "fail callback was called");
});

test("can resolve with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  Ember.run(function() {
    deferred.resolve();
  });

  equal(count1, 1, "then were resolved");
  equal(count2, 0, "then was not rejected");
});

test("can reject with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  Ember.run(function() {
    deferred.reject();
  });

  equal(count1, 0, "then was not resolved");
  equal(count2, 1, "then were rejected");
});

test("can call resolve multiple times", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count++;
  });

  Ember.run(function() {
    deferred.resolve();
    deferred.resolve();
    deferred.resolve();
  });

  equal(count, 1, "calling resolve multiple times has no effect");
});

test("resolve prevent reject", function() {
  var deferred, resolved = false, rejected = false, progress = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  Ember.run(function() {
    deferred.resolve();
  });

  Ember.run(function() {
    deferred.reject();
  });

  equal(resolved, true, "is resolved");
  equal(rejected, false, "is not rejected");
});

test("reject prevent resolve", function() {
  var deferred, resolved = false, rejected = false, progress = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  Ember.run(function() {
    deferred.reject();
  });
  Ember.run(function() {
    deferred.resolve();
  });

  equal(resolved, false, "is not resolved");
  equal(rejected, true, "is rejected");
});

test("will call callbacks if they are added after resolution", function() {

  var deferred, count1 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

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

  equal(count1, 2, "callbacks called after resolution");
});

test("then is chainable", function() {
  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    eval('error'); // Use eval to pass JSHint
  }).then(null, function() {
    count++;
  });

  Ember.run(function() {
    deferred.resolve();
  });

  equal(count, 1, "chained callback was called");
});
