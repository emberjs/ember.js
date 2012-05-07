// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('shiftObject');

suite.test("[].shiftObject() => [] + returns undefined + NO notify", function() {
  var obj, before, after, observer;

  before = [];
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.shiftObject(), undefined);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.validate('@each', undefined, 1), false, 'should NOT have notified @each once');
  equal(observer.validate('length', undefined, 1), false, 'should NOT have notified length once');
});

suite.test("[X].shiftObject() => [] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(1);
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.shiftObject(), before[0], 'should return object');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
});

suite.test("[A,B,C].shiftObject() => [B,C] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(3);
  after  = [before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.shiftObject(), before[0], 'should return object');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
});
