import { set, get, observer, mixin, Mixin } from '../..';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { destroy } from '@glimmer/destroyable';

let obj;

moduleFor(
  'Mixin observer',
  class extends AbstractTestCase {
    afterEach() {
      if (obj !== undefined) {
        destroy(obj);
        obj = undefined;
        return runLoopSettled();
      }
    }

    async ['@test global observer helper'](assert) {
      let MyMixin = Mixin.create({
        count: 0,

        foo: observer('bar', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      obj = mixin({}, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    async ['@test global observer helper takes multiple params'](assert) {
      let MyMixin = Mixin.create({
        count: 0,

        foo: observer('bar', 'baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      obj = mixin({}, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      await runLoopSettled();

      set(obj, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 2, 'should invoke observer after change');

      destroy(obj);
      await runLoopSettled();
    }

    async ['@test replacing observer should remove old observer'](assert) {
      let MyMixin = Mixin.create({
        count: 0,

        foo: observer('bar', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      let Mixin2 = Mixin.create({
        foo: observer('baz', function () {
          set(this, 'count', get(this, 'count') + 10);
        }),
      });

      obj = mixin({}, MyMixin, Mixin2);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 0, 'should not invoke observer after change');

      set(obj, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 10, 'should invoke observer after change');
    }

    async ['@test observing chain with property before'](assert) {
      let obj2 = { baz: 'baz' };

      let MyMixin = Mixin.create({
        count: 0,
        bar: obj2,
        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      obj = mixin({}, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj2, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    async ['@test observing chain with property after'](assert) {
      let obj2 = { baz: 'baz' };

      let MyMixin = Mixin.create({
        count: 0,
        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
        bar: obj2,
      });

      obj = mixin({}, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj2, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    async ['@test observing chain with property in mixin applied later'](assert) {
      let obj2 = { baz: 'baz' };

      let MyMixin = Mixin.create({
        count: 0,
        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      let MyMixin2 = Mixin.create({ bar: obj2 });

      obj = mixin({}, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      MyMixin2.apply(obj);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj2, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    async ['@test observing chain with existing property'](assert) {
      let obj2 = { baz: 'baz' };

      let MyMixin = Mixin.create({
        count: 0,
        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      obj = mixin({ bar: obj2 }, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj2, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    async ['@test observing chain with property in mixin before'](assert) {
      let obj2 = { baz: 'baz' };
      let MyMixin2 = Mixin.create({ bar: obj2 });

      let MyMixin = Mixin.create({
        count: 0,
        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      obj = mixin({}, MyMixin2, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj2, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    async ['@test observing chain with property in mixin after'](assert) {
      let obj2 = { baz: 'baz' };
      let MyMixin2 = Mixin.create({ bar: obj2 });

      let MyMixin = Mixin.create({
        count: 0,
        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      obj = mixin({}, MyMixin, MyMixin2);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj2, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    async ['@test observing chain with overridden property'](assert) {
      let obj2 = { baz: 'baz' };
      let obj3 = { baz: 'foo' };

      let MyMixin2 = Mixin.create({ bar: obj3 });

      let MyMixin = Mixin.create({
        count: 0,
        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      obj = mixin({ bar: obj2 }, MyMixin, MyMixin2);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj2, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 0, 'should not invoke observer after change');

      set(obj3, 'baz', 'BEAR');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }
  }
);
