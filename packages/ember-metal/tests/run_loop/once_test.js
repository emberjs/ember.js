import { run } from '../..';

QUnit.module('system/run_loop/once_test');

QUnit.test('calling invokeOnce more than once invokes only once', function() {
  let count = 0;
  run(() => {
    function F() { count++; }
    run.once(F);
    run.once(F);
    run.once(F);
  });

  equal(count, 1, 'should have invoked once');
});

QUnit.test('should differentiate based on target', function() {
  let A = { count: 0 };
  let B = { count: 0 };
  run(() => {
    function F() { this.count++; }
    run.once(A, F);
    run.once(B, F);
    run.once(A, F);
    run.once(B, F);
  });

  equal(A.count, 1, 'should have invoked once on A');
  equal(B.count, 1, 'should have invoked once on B');
});


QUnit.test('should ignore other arguments - replacing previous ones', function() {
  let A = { count: 0 };
  let B = { count: 0 };

  run(() => {
    function F(amt) { this.count += amt; }
    run.once(A, F, 10);
    run.once(B, F, 20);
    run.once(A, F, 30);
    run.once(B, F, 40);
  });

  equal(A.count, 30, 'should have invoked once on A');
  equal(B.count, 40, 'should have invoked once on B');
});

QUnit.test('should be inside of a runloop when running', function() {
  run(() => {
    run.once(() => ok(!!run.currentRunLoop, 'should have a runloop'));
  });
});


