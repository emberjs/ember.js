import { A as emberA } from '../../../mixins/array';

QUnit.module('NativeArray Copyable');

QUnit.test('deep copy is respected', function(assert) {
  let array = emberA([{ id: 1 }, { id: 2 }, { id: 3 }]);

  let copiedArray = array.copy(true);

  assert.deepEqual(copiedArray, array, 'copied array is equivalent');
  assert.ok(copiedArray[0] !== array[0], 'objects inside should be unique');
});
