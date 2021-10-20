import { Mixin } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Mixin.detect',
  class extends AbstractTestCase {
    ['@test detect() finds a directly applied mixin'](assert) {
      let MixinA = Mixin.create();
      let obj = {};

      assert.strictEqual(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

      MixinA.apply(obj);
      assert.strictEqual(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
    }

    ['@test detect() finds nested mixins'](assert) {
      let MixinA = Mixin.create({});
      let MixinB = Mixin.create(MixinA);
      let obj = {};

      assert.strictEqual(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

      MixinB.apply(obj);
      assert.strictEqual(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
    }

    ['@test detect() finds mixins on other mixins'](assert) {
      let MixinA = Mixin.create({});
      let MixinB = Mixin.create(MixinA);
      assert.strictEqual(MixinA.detect(MixinB), true, 'MixinA is part of MixinB');
      assert.strictEqual(MixinB.detect(MixinA), false, 'MixinB is not part of MixinA');
    }

    ['@test detect handles null values'](assert) {
      let MixinA = Mixin.create();
      assert.strictEqual(MixinA.detect(null), false);
    }
  }
);
