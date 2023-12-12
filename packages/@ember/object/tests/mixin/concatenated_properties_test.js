import { get } from '@ember/object';
import Mixin, { mixin } from '@ember/object/mixin';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Mixin concatenatedProperties',
  class extends AbstractTestCase {
    ['@test defining concatenated properties should concat future version'](assert) {
      let MixinA = Mixin.create({
        concatenatedProperties: ['foo'],
        foo: ['a', 'b', 'c'],
      });

      let MixinB = Mixin.create({
        foo: ['d', 'e', 'f'],
      });

      let obj = mixin({}, MixinA, MixinB);
      assert.deepEqual(get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f']);
    }

    ['@test ensure we do not needlessly scan concatenatedProperties array'](assert) {
      let MixinA = Mixin.create({
        concatenatedProperties: null,
      });

      let MixinB = Mixin.create({
        concatenatedProperties: null,
      });

      let obj = mixin({}, MixinA, MixinB);

      assert.deepEqual(obj.concatenatedProperties, []);
    }

    ['@test concatenatedProperties should be concatenated'](assert) {
      let MixinA = Mixin.create({
        concatenatedProperties: ['foo'],
        foo: ['a', 'b', 'c'],
      });

      let MixinB = Mixin.create({
        concatenatedProperties: 'bar',
        foo: ['d', 'e', 'f'],
        bar: [1, 2, 3],
      });

      let MixinC = Mixin.create({
        bar: [4, 5, 6],
      });

      let obj = mixin({}, MixinA, MixinB, MixinC);
      assert.deepEqual(
        get(obj, 'concatenatedProperties'),
        ['foo', 'bar'],
        'get concatenatedProperties'
      );
      assert.deepEqual(get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f'], 'get foo');
      assert.deepEqual(get(obj, 'bar'), [1, 2, 3, 4, 5, 6], 'get bar');
    }

    ['@test adding a prop that is a number should make array'](assert) {
      let MixinA = Mixin.create({
        concatenatedProperties: ['foo'],
        foo: [1, 2, 3],
      });

      let MixinB = Mixin.create({
        foo: 4,
      });

      let obj = mixin({}, MixinA, MixinB);
      assert.deepEqual(get(obj, 'foo'), [1, 2, 3, 4]);
    }

    ['@test adding a prop that is a string should make array'](assert) {
      let MixinA = Mixin.create({
        concatenatedProperties: ['foo'],
        foo: 'bar',
      });

      let obj = mixin({}, MixinA);
      assert.deepEqual(get(obj, 'foo'), ['bar']);
    }

    ['@test adding a non-concatenable property that already has a defined value should result in an array with both values'](
      assert
    ) {
      let mixinA = Mixin.create({
        foo: 1,
      });

      let mixinB = Mixin.create({
        concatenatedProperties: ['foo'],
        foo: 2,
      });

      let obj = mixin({}, mixinA, mixinB);
      assert.deepEqual(get(obj, 'foo'), [1, 2]);
    }

    ['@test adding a concatenable property that already has a defined value should result in a concatenated value'](
      assert
    ) {
      let mixinA = Mixin.create({
        foobar: 'foo',
      });

      let mixinB = Mixin.create({
        concatenatedProperties: ['foobar'],
        foobar: 'bar',
      });

      let obj = mixin({}, mixinA, mixinB);
      assert.deepEqual(get(obj, 'foobar'), ['foo', 'bar']);
    }
  }
);
