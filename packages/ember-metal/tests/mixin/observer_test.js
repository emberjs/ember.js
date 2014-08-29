/*globals testBoth */

import testBoth from 'ember-metal/tests/props_helper';
import { propertyDidChange } from 'ember-metal/property_events';
import {
  observer,
  when,
  mixin,
  Mixin
} from 'ember-metal/mixin';
import { isWatching } from "ember-metal/watching";

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

  set(obj, 'bar', "BAZ");
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

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
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

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 10, 'should invoke observer after change');

});

testBoth('observing chain with property before', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Mixin.create({
    count: 0,
    bar: obj2,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property after', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    }),
    bar: obj2
  });

  var obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin applied later', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Mixin.create({

    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var MyMixin2 = Mixin.create({bar: obj2});

  var obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  MyMixin2.apply(obj);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with existing property', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({bar: obj2}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin before', function(get, set) {
  var obj2 = {baz: 'baz'};
  var MyMixin2 = Mixin.create({bar: obj2});

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({}, MyMixin2, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin after', function(get, set) {
  var obj2 = {baz: 'baz'};
  var MyMixin2 = Mixin.create({bar: obj2});

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({}, MyMixin, MyMixin2);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with overridden property', function(get, set) {
  var obj2 = {baz: 'baz'};
  var obj3 = {baz: 'foo'};

  var MyMixin2 = Mixin.create({bar: obj3});

  var MyMixin = Mixin.create({
    count: 0,
    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = mixin({bar: obj2}, MyMixin, MyMixin2);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  equal(isWatching(obj2, 'baz'), false, 'should not be watching baz');
  equal(isWatching(obj3, 'baz'), true, 'should be watching baz');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj3, 'baz', "BEAR");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

if (Ember.FEATURES.isEnabled("conditional-observers-and-listeners")) {
  testBoth('conditional observer initially enabled', function (get, set) {

    var triggered = 0;
    var MyMixin = Mixin.create({
      foo: observer('bar', when('baz', function () { triggered++; })),
      bar: undefined,
      baz: true
    });

    var obj = mixin({}, MyMixin);
    equal(triggered, 0, 'observer is enabled; should not invoke observer immediately');

    // This first test requires EmberObject's 'init' event. Simulate it's side
    // effect for now. A proper test can be found in ember-runtime/observer_test.
    propertyDidChange(obj, 'baz');
    set(obj, 'bar', 'QUX');
    equal(triggered, 1, 'observer is enabled; should invoke observer after change');

    set(obj, 'baz', false);
    set(obj, 'bar', 'QUUX');
    equal(triggered, 1, 'observer is disabled; should not invoke observer after change');

    set(obj, 'baz', true);
    set(obj, 'bar', 'QUX');
    equal(triggered, 2, 'observer is re-enabled; should invoke observer after change');
  });

  testBoth('conditional observer initially disabled', function (get, set) {

    var triggered = 0;
    var MyMixin = Mixin.create({
      foo: observer('bar', when('baz', function () { triggered++; })),
      bar: undefined,
      baz: false
    });

    var obj = mixin({}, MyMixin);
    equal(triggered, 0, 'observer is disabled; should not invoke observer immediately');

    // This first test requires EmberObject's 'init' event. Simulate it's side
    // effect for now. A proper test can be found in ember-runtime/observer_test.
    propertyDidChange(obj, 'baz');
    set(obj, 'bar', 'QUX');
    equal(triggered, 0, 'observer is disabled; should not invoke observer after change');

    set(obj, 'baz', true);
    set(obj, 'bar', 'QUUX');
    equal(triggered, 1, 'observer is enabled; should invoke observer after change');

    set(obj, 'baz', false);
    set(obj, 'bar', 'QUX');
    equal(triggered, 1, 'observer is re-disabled; should not invoke observer after change');
  });
}
