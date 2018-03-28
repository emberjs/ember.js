import { run, getCurrentRunLoop, once } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('system/run_loop/once_test', class extends AbstractTestCase {
  ['@test calling invokeOnce more than once invokes only once'](assert) {
    let count = 0;
    run(() => {
      function F() { count++; }
      once(F);
      once(F);
      once(F);
    });

    assert.equal(count, 1, 'should have invoked once');
  }

  ['@test should differentiate based on target'](assert) {
    let A = { count: 0 };
    let B = { count: 0 };
    run(() => {
      function F() { this.count++; }
      once(A, F);
      once(B, F);
      once(A, F);
      once(B, F);
    });

    assert.equal(A.count, 1, 'should have invoked once on A');
    assert.equal(B.count, 1, 'should have invoked once on B');
  }


  ['@test should ignore other arguments - replacing previous ones'](assert) {
    let A = { count: 0 };
    let B = { count: 0 };

    run(() => {
      function F(amt) { this.count += amt; }
      once(A, F, 10);
      once(B, F, 20);
      once(A, F, 30);
      once(B, F, 40);
    });

    assert.equal(A.count, 30, 'should have invoked once on A');
    assert.equal(B.count, 40, 'should have invoked once on B');
  }

  ['@test should be inside of a runloop when running'](assert) {
    run(() => {
      once(() => assert.ok(!!getCurrentRunLoop(), 'should have a runloop'));
    });
  }
});

