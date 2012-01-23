// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('ember-metal/~tests/props_helper');

module('Ember.Mixin observer');

testBoth('global observer helper', function(get, set) {

  var MyMixin = Ember.Mixin.create({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var obj = Ember.mixin({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('global observer helper takes multiple params', function(get, set) {

  var MyMixin = Ember.Mixin.create({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar', 'baz')

  });

  var obj = Ember.mixin({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 2, 'should invoke observer after change');
});


testBoth('replacing observer should remove old observer', function(get, set) {

  var MyMixin = Ember.Mixin.create({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var Mixin2 = Ember.Mixin.create({
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+10);
    }, 'baz')
  });
  
  var obj = Ember.mixin({}, MyMixin, Mixin2);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 10, 'should invoke observer after change');

});

testBoth('observing chain with property before', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Ember.Mixin.create({
    count: 0,
    bar: obj2,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });

  var obj = Ember.mixin({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property after', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz'),
    bar: obj2
  });

  var obj = Ember.mixin({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin applied later', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Ember.Mixin.create({

    count: 0,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });

  var MyMixin2 = Ember.Mixin.create({bar: obj2});

  var obj = Ember.mixin({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  MyMixin2.apply(obj);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with existing property', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });

  var obj = Ember.mixin({bar: obj2}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin before', function(get, set) {
  var obj2 = {baz: 'baz'};
  var MyMixin2 = Ember.Mixin.create({bar: obj2});

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });

  var obj = Ember.mixin({}, MyMixin2, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin after', function(get, set) {
  var obj2 = {baz: 'baz'};
  var MyMixin2 = Ember.Mixin.create({bar: obj2});

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });

  var obj = Ember.mixin({}, MyMixin, MyMixin2);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with overriden property', function(get, set) {
  var obj2 = {baz: 'baz'};
  var obj3 = {baz: 'foo'};

  var MyMixin2 = Ember.Mixin.create({bar: obj3});

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });

  var obj = Ember.mixin({bar: obj2}, MyMixin, MyMixin2);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  equal(Em.isWatching(obj2, 'baz'), false, 'should not be watching baz');
  equal(Em.isWatching(obj3, 'baz'), true, 'should be watching baz');

  set(obj2, 'baz', "BAZ");
  equals(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj3, 'baz', "BEAR");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});
