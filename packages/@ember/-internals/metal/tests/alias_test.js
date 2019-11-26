import {
  alias,
  computed,
  defineProperty,
  get,
  set,
  addObserver,
  removeObserver,
  tagForProperty,
} from '..';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { value, validate } from '@glimmer/validator';

let obj, count;

function incrementCount() {
  count++;
}

moduleFor(
  '@ember/-internals/metal/alias',
  class extends AbstractTestCase {
    beforeEach() {
      obj = { foo: { faz: 'FOO' } };
      count = 0;
    }

    afterEach() {
      obj = null;
    }

    ['@test should proxy get to alt key'](assert) {
      defineProperty(obj, 'bar', alias('foo.faz'));
      assert.equal(get(obj, 'bar'), 'FOO');
    }

    ['@test should proxy set to alt key'](assert) {
      defineProperty(obj, 'bar', alias('foo.faz'));
      set(obj, 'bar', 'BAR');
      assert.equal(get(obj, 'foo.faz'), 'BAR');
    }

    async ['@test old dependent keys should not trigger property changes'](assert) {
      let obj1 = Object.create(null);
      defineProperty(obj1, 'foo', null, null);
      defineProperty(obj1, 'bar', alias('foo'));
      defineProperty(obj1, 'baz', alias('foo'));
      defineProperty(obj1, 'baz', alias('bar')); // redefine baz

      addObserver(obj1, 'baz', incrementCount);

      set(obj1, 'foo', 'FOO');
      await runLoopSettled();

      assert.equal(count, 1);

      removeObserver(obj1, 'baz', incrementCount);

      set(obj1, 'foo', 'OOF');
      await runLoopSettled();

      assert.equal(count, 1);
    }

    async [`@test inheriting an observer of the alias from the prototype then
    redefining the alias on the instance to another property dependent on same key
    does not call the observer twice`](assert) {
      let obj1 = EmberObject.extend({
        foo: null,
        bar: alias('foo'),
        baz: alias('foo'),

        incrementCount,
      });

      addObserver(obj1.prototype, 'baz', null, 'incrementCount');

      let obj2 = obj1.create();
      defineProperty(obj2, 'baz', alias('bar')); // override baz

      set(obj2, 'foo', 'FOO');
      await runLoopSettled();

      assert.equal(count, 1);

      removeObserver(obj2, 'baz', null, 'incrementCount');

      set(obj2, 'foo', 'OOF');
      await runLoopSettled();

      assert.equal(count, 1);
    }

    async ['@test an observer of the alias works if added after defining the alias'](assert) {
      defineProperty(obj, 'bar', alias('foo.faz'));

      addObserver(obj, 'bar', incrementCount);
      set(obj, 'foo.faz', 'BAR');

      await runLoopSettled();
      assert.equal(count, 1);
    }

    async ['@test an observer of the alias works if added before defining the alias'](assert) {
      addObserver(obj, 'bar', incrementCount);
      defineProperty(obj, 'bar', alias('foo.faz'));

      set(obj, 'foo.faz', 'BAR');

      await runLoopSettled();
      assert.equal(count, 1);
    }

    ['@test alias is dirtied if interior object of alias is set after consumption'](assert) {
      defineProperty(obj, 'bar', alias('foo.faz'));
      get(obj, 'bar');

      let tag = tagForProperty(obj, 'bar');
      let tagValue = value(tag);
      set(obj, 'foo.faz', 'BAR');

      assert.ok(!validate(tag, tagValue), 'setting the aliased key should dirty the object');
    }

    ['@test setting alias on self should fail assertion']() {
      expectAssertion(
        () => defineProperty(obj, 'bar', alias('bar')),
        "Setting alias 'bar' on self"
      );
    }

    ['@test property tags are bumped when the source changes [GH#17243]'](assert) {
      function assertPropertyTagChanged(obj, keyName, callback) {
        let tag = tagForProperty(obj, keyName);
        let before = value(tag);

        callback();

        assert.notOk(validate(tag, before), `tagForProperty ${keyName} should change`);
      }

      function assertPropertyTagUnchanged(obj, keyName, callback) {
        let tag = tagForProperty(obj, keyName);
        let before = value(tag);

        callback();

        assert.ok(validate(tag, before), `tagForProperty ${keyName} should not change`);
      }

      defineProperty(obj, 'bar', alias('foo.faz'));

      assertPropertyTagUnchanged(obj, 'bar', () => {
        assert.equal(get(obj, 'bar'), 'FOO');
      });

      assertPropertyTagChanged(obj, 'bar', () => {
        set(obj, 'foo.faz', 'BAR');
      });

      assertPropertyTagUnchanged(obj, 'bar', () => {
        assert.equal(get(obj, 'bar'), 'BAR');
      });

      assertPropertyTagUnchanged(obj, 'bar', () => {
        addObserver(obj, 'bar', incrementCount);
        removeObserver(obj, 'bar', incrementCount);
      });

      assertPropertyTagChanged(obj, 'bar', () => {
        set(obj, 'foo.faz', 'FOO');
      });

      assertPropertyTagUnchanged(obj, 'bar', () => {
        assert.equal(get(obj, 'bar'), 'FOO');
      });
    }

    ['@test nested aliases update their chained dependencies properly'](assert) {
      let count = 0;

      class Inner {
        @alias('pojo') aliased;

        pojo = {
          value: 123,
        };
      }

      class Outer {
        @computed('inner.aliased.value')
        get value() {
          count++;
          return this.inner.aliased.value;
        }

        inner = new Inner();
      }

      let outer = new Outer();

      assert.equal(outer.value, 123, 'Property works');

      outer.value;
      assert.equal(count, 1, 'Property was properly cached');

      set(outer, 'inner.pojo.value', 456);

      assert.equal(outer.value, 456, 'Property was invalidated correctly');
    }
  }
);
