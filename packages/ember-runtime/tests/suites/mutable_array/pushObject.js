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
  equal(obj.pushObject(exp), exp, 'should return pushed object');
});

suite.test("[].pushObject(X) => [X] + notify", function() {
  var obj, before, after, observer;

  before = [];
  after  = this.newFixture(1);
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.pushObject(after[0]);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].pushObject(X) => [A,B,C,X] + notify", function() {
  var obj, before, after, item, observer;

  before = this.newFixture(3);
  item   = this.newFixture(1)[0];
  after  = [before[0], before[1], before[2], item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.pushObject(item);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }
});
