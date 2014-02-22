import run from 'ember-metal/run_loop';

module('system/run_loop/run_bind_test');

test('Ember.run.bind builds a run-loop wrapped callback handler', function() {
  expect(3);

  var obj = {
    value: 0,
    increment: function(increment) {
      ok(run.currentRunLoop, 'expected a run-loop');
      return this.value += increment;
    }
  };

  var proxiedFunction = run.bind(obj, obj.increment, 1);
  equal(proxiedFunction(), 1);
  equal(obj.value, 1);
});
