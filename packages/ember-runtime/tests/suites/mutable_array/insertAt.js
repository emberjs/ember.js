// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises */

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('insertAt');

suite.test("[].insertAt(0, X) => [X] + notify", function() {
  var obj, after, observer;
  
  after = this.newFixture(1);
  obj = this.newObject([]);
  observer = this.newObserver(obj, '[]', 'length');

  obj.insertAt(0, after[0]);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[].insertAt(200,X) => OUT_OF_RANGE_EXCEPTION exception", function() {
  var obj = this.newObject([]), that = this;
  raises(function() {
    obj.insertAt(200, that.newFixture(1)[0]);
  }, Error);
});

suite.test("[A].insertAt(0, X) => [X,A] + notify", function() {
  var obj, item, after, before, observer;
  
  item = this.newFixture(1)[0];
  before = this.newFixture(1);
  after  = [item, before[0]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.insertAt(0, item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A].insertAt(1, X) => [A,X] + notify", function() {
  var obj, item, after, before, observer;
  
  item = this.newFixture(1)[0];
  before = this.newFixture(1);
  after  = [before[0], item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.insertAt(1, item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A].insertAt(200,X) => OUT_OF_RANGE exception", function() {
  var obj = this.newObject(this.newFixture(1)), that = this;
  raises(function() {
    obj.insertAt(200, that.newFixture(1)[0]);
  }, Error);
});

suite.test("[A,B,C].insertAt(0,X) => [X,A,B,C] + notify", function() {
  var obj, item, after, before, observer;
  
  item = this.newFixture(1)[0];
  before = this.newFixture(3);
  after  = [item, before[0], before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.insertAt(0, item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].insertAt(1,X) => [A,X,B,C] + notify", function() {
  var obj, item, after, before, observer;
  
  item = this.newFixture(1)[0];
  before = this.newFixture(3);
  after  = [before[0], item, before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.insertAt(1, item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].insertAt(3,X) => [A,B,C,X] + notify", function() {
  var obj, item, after, before, observer;
  
  item = this.newFixture(1)[0];
  before = this.newFixture(3);
  after  = [before[0], before[1], before[2], item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.insertAt(3, item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});