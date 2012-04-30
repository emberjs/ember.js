// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('unshiftObjects');

suite.test("returns receiver", function() {
  var obj = this.newObject([]);
  var item = this.newFixture(1);
  equal(obj.unshiftObjects(item), obj, 'should return receiver');
});

suite.test("[].unshiftObjects([A,B,C]) => [A,B,C] + notify", function() {
  var obj, before, after, items, observer;

  before = [];
  items = this.newFixture(3);
  after  = items;
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.unshiftObjects(items);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].unshiftObjects([X,Y,Z]) => [X,Y,Z,A,B,C] + notify", function() {
  var obj, before, after, items, observer;

  before = this.newFixture(3);
  items = this.newFixture(3);
  after  = [items[0], items[1], items[2], before[0], before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.unshiftObjects(items);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].unshiftObjects([A,B,C]) => [A,B,C,A,B,C] + notify", function() {
  var obj, before, after, items, observer;

  before = this.newFixture(3);
  items = before; // note same objects as current. should end up twice
  after  = [before[0], before[1], before[2], before[0], before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.unshiftObjects(items);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }
});
