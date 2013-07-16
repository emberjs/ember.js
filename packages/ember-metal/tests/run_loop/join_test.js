module('system/run_loop/join_test');

test('Ember.run.join brings its own run loop if none provided', function() {
  ok(!Ember.run.currentRunLoop, 'expects no existing run-loop');

  Ember.run.join(function() {
    ok(Ember.run.currentRunLoop, 'brings its own run loop');
  });
});

test('Ember.run.join joins and existing run-loop, and fires its action queue.', function() {
  var outerRunLoop, wasInvoked;

  Ember.run(function() {
    outerRunLoop = Ember.run.currentRunLoop;

    Ember.run.join(function() {
      wasInvoked = true;
      deepEqual(outerRunLoop, Ember.run.currentRunLoop, 'joined the existing run-loop');
    });

    ok(!wasInvoked, 'expected the joined callback not be invoked yet');
  });
  ok(wasInvoked, 'expected the joined callback to have invoked');
});

test('Ember.run.join returns a value if creating a new run-loop', function() {
  var value = 'returned value';

  var result = Ember.run.join(function() {
    return value;
  });

  equal(value, result, 'returns expected output');
});

test('Ember.run.join returns undefined if joining another run-loop', function() {
  var value = 'returned value',
  result;

  Ember.run(function() {
    var result = Ember.run.join(function() {
      return value;
    });
  });

  equal(result, undefined, 'returns nothing');
});

