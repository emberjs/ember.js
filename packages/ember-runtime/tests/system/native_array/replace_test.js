import { A } from '../../../mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('NativeArray.replace', class extends AbstractTestCase {
  ['@test raises assertion if third argument is not an array']() {
    expectAssertion(function() {
      A([1, 2, 3]).replace(1, 1, '');
    }, 'The third argument to replace needs to be an array.');
  }

  ['@test it does not raise an assertion if third parameter is not passed'](assert) {
    assert.deepEqual(A([1, 2, 3]).replace(1, 2), A([1]), 'no assertion raised');
  }
});

