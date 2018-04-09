import { A as emberA } from '../../../lib/mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'NativeArray Copyable',
  class extends AbstractTestCase {
    ['@test deep copy is respected'](assert) {
      let array = emberA([{ id: 1 }, { id: 2 }, { id: 3 }]);

      let copiedArray = array.copy(true);

      assert.deepEqual(copiedArray, array, 'copied array is equivalent');
      assert.ok(copiedArray[0] !== array[0], 'objects inside should be unique');
    }
  }
);
