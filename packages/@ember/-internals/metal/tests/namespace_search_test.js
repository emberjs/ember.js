import Mixin from '@ember/object/mixin';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../deprecations';

moduleFor(
  'NamespaceSearch',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test classToString: null as this inside class must not throw error`](
      assert
    ) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let mixin = Mixin.create();
      assert.equal(
        mixin.toString(),
        '(unknown mixin)',
        'this = null should be handled on Mixin.toString() call'
      );
    }
  }
);
