import { testBoth } from 'ember-metal/tests/props_helper';
import {
  observer,
  mixin,
  Mixin
} from 'ember-metal/mixin';
import { isWatching } from 'ember-metal/watching';

QUnit.module('Mixin observer');

testBoth('global observer helper', function(get, set) {

  var MyMixin = Mixin.create({

    count: 0,

    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('global observer helper takes multiple params', function(get, set) {

  var MyMixin = Mixin.create({

    count: 0,

    foo: observer('bar', 'baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  set(obj, 'baz', 'BAZ');
  equal(get(obj, 'count'), 2, 'should invoke observer after change');
});


testBoth('replacing observer should remove old observer', function(get, set) {

  var MyMixin = Mixin.create({

    count: 0,

    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var Mixin2 = Mixin.create({
    foo: observer('baz', function() {
      set(this, 'count', get(this, 'count')+10);
    })
  });

  var obj = mixin({}, MyMixin, Mixin2);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', 'BAZ');
  equal(get(obj, 'count'), 10, 'should invoke observer after change');

});

testBoth('observing chain with property before', function(get, set) {
  var obj2 = { baz: 'baz' };

  var MyMixin = Mixin.create({
    count: 0,
    bar: obj2,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property after', function(get, set) {
  var obj2 = { baz: 'baz' };

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    }),
    bar: obj2
  });

  var obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin applied later', function(get, set) {
  var obj2 = { baz: 'baz' };

  var MyMixin = Mixin.create({

    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var MyMixin2 = Mixin.create({ bar: obj2 });

  var obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  MyMixin2.apply(obj);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with existing property', function(get, set) {
  var obj2 = { baz: 'baz' };

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({ bar: obj2 }, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin before', function(get, set) {
  var obj2 = { baz: 'baz' };
  var MyMixin2 = Mixin.create({ bar: obj2 });

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({}, MyMixin2, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin after', function(get, set) {
  var obj2 = { baz: 'baz' };
  var MyMixin2 = Mixin.create({ bar: obj2 });

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({}, MyMixin, MyMixin2);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with overriden property', function(get, set) {
  var obj2 = { baz: 'baz' };
  var obj3 = { baz: 'foo' };

  var MyMixin2 = Mixin.create({ bar: obj3 });

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({ bar: obj2 }, MyMixin, MyMixin2);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  equal(isWatching(obj2, 'baz'), false, 'should not be watching baz');
  equal(isWatching(obj3, 'baz'), true, 'should be watching baz');

  set(obj2, 'baz', 'BAZ');
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj3, 'baz', 'BEAR');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});
