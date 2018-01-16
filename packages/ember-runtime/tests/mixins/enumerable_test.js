import Enumerable from '../../mixins/enumerable';
import ArrayProxy from '../../system/array_proxy';
import { A } from '../../system/native_array';

QUnit.module('Enumerable');

QUnit.test('should be mixed into A()', assert => {
  assert.ok(Enumerable.detect(A()));
});

QUnit.test('should be mixed into ArrayProxy', assert => {
  assert.ok(Enumerable.detect(ArrayProxy.create()));
});
