import run from '../../run_loop';

QUnit.module('system/run_loop/sync_test');

QUnit.test('sync() will immediately flush the sync queue only', function() {
  let cnt = 0;

  run(() => {
    function cntup() { cnt++; }

    function syncfunc() {
      if (++cnt < 5) {
        run.schedule('sync', syncfunc);
      }
      run.schedule('actions', cntup);
    }

    syncfunc();

    equal(cnt, 1, 'should not run action yet');
    run.sync();

    equal(cnt, 5, 'should have run sync queue continuously');
  });

  equal(cnt, 10, 'should flush actions now too');
});

QUnit.test('calling sync() outside a run loop does not cause an error', function() {
  expect(0);

  run.sync();
});
