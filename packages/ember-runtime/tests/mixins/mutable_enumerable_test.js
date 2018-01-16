import MutableEnumerable from '../../mixins/mutable_enumerable';
import ArrayProxy from '../../system/array_proxy';
import { A } from '../../system/native_array';

QUnit.module('MutableEnumerable');

QUnit.test('should be mixed into A()', assert => {
  assert.ok(MutableEnumerable.detect(A()));
});

QUnit.test('should be mixed into ArrayProxy', assert => {
  assert.ok(MutableEnumerable.detect(ArrayProxy.create()));
});
