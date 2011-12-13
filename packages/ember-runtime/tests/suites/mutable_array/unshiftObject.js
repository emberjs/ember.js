// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('unshiftObject');

suite.test("returns unshifted object", function() {
  var obj = this.newObject([]);
  var item = this.newFixture(1)[0];
  equals(obj.unshiftObject(item), item, 'should return receiver');
});


suite.test("[].unshiftObject(X) => [X] + notify", function() {
  var obj, before, after, item, observer;
  
  before = [];
  item = this.newFixture(1)[0];
  after  = [item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.unshiftObject(item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].unshiftObject(X) => [X,A,B,C] + notify", function() {
  var obj, before, after, item, observer;
  
  before = this.newFixture(3);
  item = this.newFixture(1)[0];
  after  = [item, before[0], before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.unshiftObject(item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].unshiftObject(A) => [A,A,B,C] + notify", function() {
  var obj, before, after, item, observer;
  
  before = this.newFixture(3);
  item = before[0]; // note same object as current head. should end up twice
  after  = [item, before[0], before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.unshiftObject(item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});