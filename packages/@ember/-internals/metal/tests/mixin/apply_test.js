import { get, Mixin, mixin } from '../..';
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
