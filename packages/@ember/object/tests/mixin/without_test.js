import Mixin from '@ember/object/mixin';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../../-internals/deprecations';

moduleFor(
  'without',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test without should create a new mixin excluding named properties`](
      assert
    ) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let MixinA = Mixin.create({
        foo: 'FOO',
        bar: 'BAR',
      });

      let MixinB = MixinA.without('bar');

      let obj = {};
      MixinB.apply(obj);

      assert.equal(obj.foo, 'FOO', 'should defined foo');
      assert.equal(obj.bar, undefined, 'should not define bar');
    }
  }
);
