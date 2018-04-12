import { run, schedule } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/run_loop/sync_test',
  class extends AbstractTestCase {
    ['@test sync() will immediately flush the sync queue only'](assert) {
      let cnt = 0;

      run(() => {
        function cntup() {
          cnt++;
        }

        function syncfunc() {
          if (++cnt < 5) {
            expectDeprecation(() => {
              schedule('sync', syncfunc);
            }, `Scheduling into the 'sync' run loop queue is deprecated.`);
          }
          schedule('actions', cntup);
        }

        syncfunc();

        assert.equal(cnt, 1, 'should not run action yet');
      });

      assert.equal(cnt, 10, 'should flush actions now too');
    }
  }
);
