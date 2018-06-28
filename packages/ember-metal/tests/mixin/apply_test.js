import { get, Mixin, mixin, descriptor } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function K() {}

moduleFor(
  'Mixin.apply',
  class extends AbstractTestCase {
    ['@test using apply() should apply properties'](assert) {
      let MixinA = Mixin.create({ foo: 'FOO', baz: K });
      let obj = {};
      mixin(obj, MixinA);

      assert.equal(get(obj, 'foo'), 'FOO', 'should apply foo');
      assert.equal(get(obj, 'baz'), K, 'should apply foo');
    }

    ['@test descriptor with configurable:false works correctly'](assert) {
      let MixinA = Mixin.create({
        foo: null,
      });

      let MixinB = Mixin.create({
        foo: descriptor({
          configurable: false,
          get() {
            return 'FOO';
          },
        }),
      });

      let obj = {};
      mixin(obj, MixinA, MixinB);

      assert.equal(get(obj, 'foo'), 'FOO', 'should apply foo');

      let MixinOne = Mixin.create({
        foo: descriptor({
          configurable: false,
          get() {
            return 'FOO';
          },
        }),
      });

      let MixinTwo = Mixin.create({
        foo: null,
      });

      let myObj = {};

      expectAssertion(() => {
        mixin(myObj, MixinOne, MixinTwo);
      }, `cannot redefine property \`foo\`, it is not configurable`);
    }

    ['@test applying anonymous properties'](assert) {
      let obj = {};
      mixin(obj, {
        foo: 'FOO',
        baz: K,
      });

      assert.equal(get(obj, 'foo'), 'FOO', 'should apply foo');
      assert.equal(get(obj, 'baz'), K, 'should apply foo');
    }

    ['@test applying null values']() {
      expectAssertion(() => mixin({}, null));
    }

    ['@test applying a property with an undefined value'](assert) {
      let obj = { tagName: '' };
      mixin(obj, { tagName: undefined });

      assert.strictEqual(get(obj, 'tagName'), '');
    }
  }
);
