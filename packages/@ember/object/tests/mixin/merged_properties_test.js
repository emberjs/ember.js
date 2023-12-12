import EmberObject, { get } from '@ember/object';
import Mixin, { mixin } from '@ember/object/mixin';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Mixin mergedProperties',
  class extends AbstractTestCase {
    ['@test defining mergedProperties should merge future version'](assert) {
      let MixinA = Mixin.create({
        mergedProperties: ['foo'],
        foo: { a: true, b: true, c: true },
      });

      let MixinB = Mixin.create({
        foo: { d: true, e: true, f: true },
      });

      let obj = mixin({}, MixinA, MixinB);
      assert.deepEqual(get(obj, 'foo'), {
        a: true,
        b: true,
        c: true,
        d: true,
        e: true,
        f: true,
      });
    }

    ['@test defining mergedProperties on future mixin should merged into past'](assert) {
      let MixinA = Mixin.create({
        foo: { a: true, b: true, c: true },
      });

      let MixinB = Mixin.create({
        mergedProperties: ['foo'],
        foo: { d: true, e: true, f: true },
      });

      let obj = mixin({}, MixinA, MixinB);
      assert.deepEqual(get(obj, 'foo'), {
        a: true,
        b: true,
        c: true,
        d: true,
        e: true,
        f: true,
      });
    }

    ['@test defining mergedProperties with null properties should keep properties null'](assert) {
      let MixinA = Mixin.create({
        mergedProperties: ['foo'],
        foo: null,
      });

      let MixinB = Mixin.create({
        foo: null,
      });

      let obj = mixin({}, MixinA, MixinB);
      assert.equal(get(obj, 'foo'), null);
    }

    ["@test mergedProperties' properties can get overwritten"](assert) {
      let MixinA = Mixin.create({
        mergedProperties: ['foo'],
        foo: { a: 1 },
      });

      let MixinB = Mixin.create({
        foo: { a: 2 },
      });

      let obj = mixin({}, MixinA, MixinB);
      assert.deepEqual(get(obj, 'foo'), { a: 2 });
    }

    ['@test mergedProperties should be concatenated'](assert) {
      let MixinA = Mixin.create({
        mergedProperties: ['foo'],
        foo: { a: true, b: true, c: true },
      });

      let MixinB = Mixin.create({
        mergedProperties: 'bar',
        foo: { d: true, e: true, f: true },
        bar: { a: true, l: true },
      });

      let MixinC = Mixin.create({
        bar: { e: true, x: true },
      });

      let obj = mixin({}, MixinA, MixinB, MixinC);
      assert.deepEqual(get(obj, 'mergedProperties'), ['foo', 'bar'], 'get mergedProperties');
      assert.deepEqual(
        get(obj, 'foo'),
        { a: true, b: true, c: true, d: true, e: true, f: true },
        'get foo'
      );
      assert.deepEqual(get(obj, 'bar'), { a: true, l: true, e: true, x: true }, 'get bar');
    }

    ['@test mergedProperties should exist even if not explicitly set on create'](assert) {
      let AnObj = EmberObject.extend({
        mergedProperties: ['options'],
        options: {
          a: 'a',
          b: {
            c: 'ccc',
          },
        },
      });

      let obj = AnObj.create({
        options: {
          a: 'A',
        },
      });

      assert.equal(get(obj, 'options').a, 'A');
      assert.equal(get(obj, 'options').b.c, 'ccc');
    }

    ['@test defining mergedProperties at create time should not modify the prototype'](assert) {
      let AnObj = EmberObject.extend({
        mergedProperties: ['options'],
        options: {
          a: 1,
        },
      });

      let objA = AnObj.create({
        options: {
          a: 2,
        },
      });
      let objB = AnObj.create({
        options: {
          a: 3,
        },
      });

      assert.equal(get(objA, 'options').a, 2);
      assert.equal(get(objB, 'options').a, 3);
    }

    ["@test mergedProperties' overwriting methods can call _super"](assert) {
      assert.expect(4);

      let MixinA = Mixin.create({
        mergedProperties: ['foo'],
        foo: {
          meth(a) {
            assert.equal(a, 'WOOT', "_super successfully called MixinA's `foo.meth` method");
            return 'WAT';
          },
        },
      });

      let MixinB = Mixin.create({
        foo: {
          meth() {
            assert.ok(true, "MixinB's `foo.meth` method called");
            return this._super(...arguments);
          },
        },
      });

      let MixinC = Mixin.create({
        foo: {
          meth(a) {
            assert.ok(true, "MixinC's `foo.meth` method called");
            return this._super(a);
          },
        },
      });

      let obj = mixin({}, MixinA, MixinB, MixinC);
      assert.equal(obj.foo.meth('WOOT'), 'WAT');
    }

    ['@test Merging an Array should raise an error'](assert) {
      assert.expect(1);

      let MixinA = Mixin.create({
        mergedProperties: ['foo'],
        foo: { a: true, b: true, c: true },
      });

      let MixinB = Mixin.create({
        foo: ['a'],
      });

      expectAssertion(() => {
        mixin({}, MixinA, MixinB);
      }, 'You passed in `["a"]` as the value for `foo` but `foo` cannot be an Array');
    }
  }
);
