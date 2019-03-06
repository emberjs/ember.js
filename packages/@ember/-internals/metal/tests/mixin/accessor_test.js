import { Mixin } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Mixin Accessors',
  class extends AbstractTestCase {
    ['@test works with getters'](assert) {
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

    ['@test works with setters'](assert) {
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
