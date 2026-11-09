import { A } from '@ember/array';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

const EMBER_A = DEPRECATIONS.DEPRECATE_EMBER_ARRAY_A;

moduleFor(
  'NativeArray.replace',
  class extends AbstractTestCase {
    [`${testUnless(EMBER_A.isRemoved)} @test raises assertion if third argument is not an array`]() {
      expectDeprecation(/`A` from `@ember\/array` is deprecated/, EMBER_A.isEnabled);

      expectAssertion(function () {
        A([1, 2, 3]).replace(1, 1, '');
      }, 'The third argument to replace needs to be an array.');
    }

    [`${testUnless(
      EMBER_A.isRemoved
    )} @test it does not raise an assertion if third parameter is not passed`](assert) {
      expectDeprecation(/`A` from `@ember\/array` is deprecated/, EMBER_A.isEnabled);

      assert.deepEqual(A([1, 2, 3]).replace(1, 2), A([1]), 'no assertion raised');
    }
  }
);
