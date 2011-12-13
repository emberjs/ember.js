// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('pushObject');

suite.test("returns pushed object", function() {
  var exp = this.newFixture(1)[0];
  var obj = this.newObject([]);
  equals(obj.pushObject(exp), exp, 'should return pushed object');
});

suite.test("[].pushObject(X) => [X] + notify", function() {
  var obj, before, after, observer, ret;
  
  before = [];
  after  = this.newFixture(1);
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.pushObject(after[0]);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].pushObject(X) => [A,B,C,X] + notify", function() {
  var obj, before, after, item, observer, ret;
  
  before = this.newFixture(3);
  item   = this.newFixture(1)[0];
  after  = [before[0], before[1], before[2], item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.pushObject(item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});