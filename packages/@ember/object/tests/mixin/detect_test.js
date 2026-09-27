import Mixin from '@ember/object/mixin';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../../-internals/deprecations';

moduleFor(
  'Mixin.detect',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test detect() finds a directly applied mixin`](
      assert
    ) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let MixinA = Mixin.create();
      let obj = {};

      assert.equal(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

      MixinA.apply(obj);
      assert.equal(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test detect() finds nested mixins`](
      assert
    ) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let MixinA = Mixin.create({});
      let MixinB = Mixin.create(MixinA);
      let obj = {};

      assert.equal(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

      MixinB.apply(obj);
      assert.equal(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test detect() finds mixins on other mixins`](
      assert
    ) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let MixinA = Mixin.create({});
      let MixinB = Mixin.create(MixinA);
      assert.equal(MixinA.detect(MixinB), true, 'MixinA is part of MixinB');
      assert.equal(MixinB.detect(MixinA), false, 'MixinB is not part of MixinA');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test detect handles null values`](
      assert
    ) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let MixinA = Mixin.create();
      assert.equal(MixinA.detect(null), false);
    }
  }
);
