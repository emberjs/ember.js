module('system/run_loop/schedule_test');

test('scheduling item in queue should defer until finished', function() {
  var cnt = 0;

  Ember.run(function() {
    Ember.run.schedule('actions', function() { cnt++; });
    Ember.run.schedule('actions', function() { cnt++; });
    equal(cnt, 0, 'should not run action yet') ;
  });

  equal(cnt, 2, 'should flush actions now');

});

test('nested runs should queue each phase independently', function() {
  var cnt = 0;

  Ember.run(function() {
    Ember.run.schedule('actions', function() { cnt++; });
    equal(cnt, 0, 'should not run action yet') ;

    Ember.run(function() {
      Ember.run.schedule('actions', function() { cnt++; });
    });
    equal(cnt, 1, 'should not run action yet') ;

  });

  equal(cnt, 2, 'should flush actions now');

});

test('prior queues should be flushed before moving on to next queue', function() {
  var order = [];

  Ember.run(function() {
    var runLoop = Ember.run.currentRunLoop;
    ok(runLoop, 'run loop present');

    Ember.run.schedule('sync', function() {
      order.push('sync');
      equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');
    });
    Ember.run.schedule('actions', function() {
      order.push('actions');
      equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');

      Ember.run.schedule('actions', function() {
        order.push('actions');
        equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');
      });

      Ember.run.schedule('sync', function() {
        order.push('sync');
        equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');
      });
    });
    Ember.run.schedule('destroy', function() {
      order.push('destroy');
      equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');
    });
  });

  deepEqual(order, ['sync', 'actions', 'sync', 'actions', 'destroy']);
});

test('makes sure it does not trigger an autorun during testing', function() {
  expectAssertion(function() {
    Ember.run.schedule('actions', function() {});
  }, /wrap any code with asynchronous side-effects in an Ember.run/);

  // make sure not just the first violation is asserted.
  expectAssertion(function() {
    Ember.run.schedule('actions', function() {});
  }, /wrap any code with asynchronous side-effects in an Ember.run/);
});
