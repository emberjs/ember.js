import run from '../../run_loop';

QUnit.module('system/run_loop/run_bind_test');

QUnit.test('Ember.run.bind builds a run-loop wrapped callback handler', function() {
  expect(3);

  let obj = {
    value: 0,
    increment(increment) {
      ok(run.currentRunLoop, 'expected a run-loop');
      return this.value += increment;
    }
  };

  let proxiedFunction = run.bind(obj, obj.increment, 1);
  equal(proxiedFunction(), 1);
  equal(obj.value, 1);
});

QUnit.test('Ember.run.bind keeps the async callback arguments', function() {
  expect(4);

  function asyncCallback(increment, increment2, increment3) {
    ok(run.currentRunLoop, 'expected a run-loop');
    equal(increment, 1);
    equal(increment2, 2);
    equal(increment3, 3);
  }

  function asyncFunction(fn) {
    fn(2, 3);
  }

  asyncFunction(run.bind(asyncCallback, asyncCallback, 1));
});
