// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises */

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('removeAt');

suite.test("[X].removeAt(0) => [] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(1);
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.removeAt(0), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
});

suite.test("[].removeAt(200) => OUT_OF_RANGE_EXCEPTION exception", function() {
  var obj = this.newObject([]);
  raises(function() {
    obj.removeAt(200);
  }, Error);
});

suite.test("[A,B].removeAt(0) => [B] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(2);
  after  = [before[1]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.removeAt(0), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
});

suite.test("[A,B].removeAt(1) => [A] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(2);
  after  = [before[0]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.removeAt(1), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
});

suite.test("[A,B,C].removeAt(1) => [A,C] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(3);
  after  = [before[0], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.removeAt(1), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
});

suite.test("[A,B,C,D].removeAt(1,2) => [A,D] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(4);
  after  = [before[0], before[3]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.removeAt(1,2), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
});

suite.notest("[A,B,C,D].removeAt(IndexSet<0,2-3>) => [B] + notify");
