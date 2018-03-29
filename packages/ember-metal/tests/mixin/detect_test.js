import { Mixin } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Mixin.detect',
  class extends AbstractTestCase {
    ['@test detect() finds a directly applied mixin'](assert) {
      let MixinA = Mixin.create();
      let obj = {};

      assert.equal(
        MixinA.detect(obj),
        false,
        'MixinA.detect(obj) before apply()'
      );

      MixinA.apply(obj);
      assert.equal(
        MixinA.detect(obj),
        true,
        'MixinA.detect(obj) after apply()'
      );
    }

    ['@test detect() finds nested mixins'](assert) {
      let MixinA = Mixin.create({});
      let MixinB = Mixin.create(MixinA);
      let obj = {};

      assert.equal(
        MixinA.detect(obj),
        false,
        'MixinA.detect(obj) before apply()'
      );

      MixinB.apply(obj);
      assert.equal(
        MixinA.detect(obj),
        true,
        'MixinA.detect(obj) after apply()'
      );
    }

    ['@test detect() finds mixins on other mixins'](assert) {
      let MixinA = Mixin.create({});
      let MixinB = Mixin.create(MixinA);
      assert.equal(MixinA.detect(MixinB), true, 'MixinA is part of MixinB');
      assert.equal(
        MixinB.detect(MixinA),
        false,
        'MixinB is not part of MixinA'
      );
    }

    ['@test detect handles null values'](assert) {
      let MixinA = Mixin.create();
      assert.equal(MixinA.detect(null), false);
    }
  }
);
