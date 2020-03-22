import { run } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/run_loop/run_test',
  class extends AbstractTestCase {
    ['@test run invokes passed function, returning value'](assert) {
      let obj = {
        foo() {
          return [this.bar, 'FOO'];
        },
        bar: 'BAR',
        checkArgs(arg1, arg2) {
          return [arg1, this.bar, arg2];
        },
      };

      assert.equal(run(() => 'FOO'), 'FOO', 'pass function only');
      assert.deepEqual(run(obj, obj.foo), ['BAR', 'FOO'], 'pass obj and obj.method');
      assert.deepEqual(run(obj, 'foo'), ['BAR', 'FOO'], 'pass obj and "method"');
      assert.deepEqual(
        run(obj, obj.checkArgs, 'hello', 'world'),
        ['hello', 'BAR', 'world'],
        'pass obj, obj.method, and extra arguments'
      );
    }
  }
);
