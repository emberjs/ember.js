import { A } from '../../../system/native_array';

QUnit.module('NativeArray.replace');

QUnit.test('raises assertion if third argument is not an array', function() {
  expectAssertion(function() {
    A([1, 2, 3]).replace(1, 1, '');
  }, 'The third argument to replace needs to be an array.');
});

QUnit.test('it does not raise an assertion if third parameter is not passed', function() {
  deepEqual(A([1, 2, 3]).replace(1, 2), A([1]), 'no assertion raised');
});
