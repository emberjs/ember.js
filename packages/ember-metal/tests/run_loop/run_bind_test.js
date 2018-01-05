import { run } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('system/run_loop/run_bind_test', class extends AbstractTestCase {
  ['@test Ember.run.bind builds a run-loop wrapped callback handler'](assert) {
    assert.expect(3);

    let obj = {
      value: 0,
      increment(increment) {
        assert.ok(run.currentRunLoop, 'expected a run-loop');
        return this.value += increment;
      }
    };

    let proxiedFunction = run.bind(obj, obj.increment, 1);
    assert.equal(proxiedFunction(), 1);
    assert.equal(obj.value, 1);
  }

  ['@test Ember.run.bind keeps the async callback arguments'](assert) {
    assert.expect(4);

    function asyncCallback(increment, increment2, increment3) {
      assert.ok(run.currentRunLoop, 'expected a run-loop');
      assert.equal(increment, 1);
      assert.equal(increment2, 2);
      assert.equal(increment3, 3);
    }

    function asyncFunction(fn) {
      fn(2, 3);
    }

    asyncFunction(run.bind(asyncCallback, asyncCallback, 1));
  }
});
