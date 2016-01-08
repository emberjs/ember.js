import { generateGuid } from 'ember-metal/utils';
import { A as emberA } from 'ember-runtime/system/native_array';
import CopyableTests from 'ember-runtime/tests/suites/copyable';

CopyableTests.extend({
  name: 'NativeArray Copyable',

  newObject() {
    return emberA([generateGuid()]);
  },

  isEqual(a, b) {
    if (!(a instanceof Array)) {
      return false;
    }

    if (!(b instanceof Array)) {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    return a[0] === b[0];
  },

  shouldBeFreezable: false
}).run();

QUnit.module('NativeArray Copyable');

QUnit.test('deep copy is respected', function() {
  var array = emberA([{ id: 1 }, { id: 2 }, { id: 3 }]);

  var copiedArray = array.copy(true);

  deepEqual(copiedArray, array, 'copied array is equivalent');
  ok(copiedArray[0] !== array[0], 'objects inside should be unique');
});
