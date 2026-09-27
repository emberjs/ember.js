import Mixin from '@ember/object/mixin';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../../-internals/deprecations';

moduleFor(
  'Mixin Accessors',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test works with getters`](assert) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let count = 0;

      let MixinA = Mixin.create({
        get prop() {
          return count++;
        },
      });

      let obj = {};
      MixinA.apply(obj);

      assert.equal(obj.prop, 0, 'getter defined correctly');
      assert.equal(obj.prop, 1, 'getter defined correctly');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test works with setters`](assert) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let MixinA = Mixin.create({
        set prop(value) {
          this._prop = value + 1;
        },
      });

      let obj = {};
      MixinA.apply(obj);

      obj.prop = 0;

      assert.equal(obj._prop, 1, 'setter defined correctly');
    }
  }
);
