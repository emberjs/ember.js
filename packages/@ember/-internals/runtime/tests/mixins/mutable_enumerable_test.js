import MutableEnumerable from '@ember/enumerable/mutable';
import ArrayProxy from '@ember/array/proxy';
import { A } from '@ember/array';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

moduleFor(
  'MutableEnumerable',
  class extends AbstractTestCase {
    ['@test should be mixed into A()'](assert) {
      assert.ok(MutableEnumerable.detect(A()));
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isRemoved)} @test should be mixed into ArrayProxy`](
      assert
    ) {
      expectDeprecation(/`ArrayProxy` is deprecated/, DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isEnabled);

      assert.ok(MutableEnumerable.detect(ArrayProxy.create()));
    }
  }
);
