import { testBoth } from 'internal-test-helpers';
import {
  observer,
  mixin,
  Mixin,
  isWatching
} from '../..';

QUnit.module('Mixin observer');

testBoth('global observer helper', function(get, set, assert) {
  let MyMixin = Mixin.create({

    count: 0,

    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count') + 1);
    })

  });

  let obj = mixin({}, MyMixin);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('global observer helper takes multiple params', function(get, set, assert) {
  let MyMixin = Mixin.create({

    count: 0,

    foo: observer('bar', 'baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })

  });

  let obj = mixin({}, MyMixin);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  set(obj, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 2, 'should invoke observer after change');
});

testBoth('replacing observer should remove old observer', function(get, set, assert) {
  let MyMixin = Mixin.create({

    count: 0,

    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count') + 1);
    })

  });

  let Mixin2 = Mixin.create({
    foo: observer('baz', function() {
      set(this, 'count', get(this, 'count') + 10);
    })
  });

  let obj = mixin({}, MyMixin, Mixin2);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 10, 'should invoke observer after change');
});

testBoth('observing chain with property before', function(get, set, assert) {
  let obj2 = { baz: 'baz' };

  let MyMixin = Mixin.create({
    count: 0,
    bar: obj2,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj = mixin({}, MyMixin);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property after', function(get, set, assert) {
  let obj2 = { baz: 'baz' };

  let MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    }),
    bar: obj2
  });

  let obj = mixin({}, MyMixin);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin applied later', function(get, set, assert) {
  let obj2 = { baz: 'baz' };

  let MyMixin = Mixin.create({

    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let MyMixin2 = Mixin.create({ bar: obj2 });

  let obj = mixin({}, MyMixin);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  MyMixin2.apply(obj);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with existing property', function(get, set, assert) {
  let obj2 = { baz: 'baz' };

  let MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj = mixin({ bar: obj2 }, MyMixin);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin before', function(get, set, assert) {
  let obj2 = { baz: 'baz' };
  let MyMixin2 = Mixin.create({ bar: obj2 });

  let MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj = mixin({}, MyMixin2, MyMixin);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin after', function(get, set, assert) {
  let obj2 = { baz: 'baz' };
  let MyMixin2 = Mixin.create({ bar: obj2 });

  let MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj = mixin({}, MyMixin, MyMixin2);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with overridden property', function(get, set, assert) {
  let obj2 = { baz: 'baz' };
  let obj3 = { baz: 'foo' };

  let MyMixin2 = Mixin.create({ bar: obj3 });

  let MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj = mixin({ bar: obj2 }, MyMixin, MyMixin2);
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  assert.equal(isWatching(obj2, 'baz'), false, 'should not be watching baz');
  assert.equal(isWatching(obj3, 'baz'), true, 'should be watching baz');

  set(obj2, 'baz', 'BAZ');
  assert.equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj3, 'baz', 'BEAR');
  assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
});
