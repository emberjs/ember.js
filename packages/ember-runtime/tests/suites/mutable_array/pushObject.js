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
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.pushObject(after[0]);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test("[A,B,C].pushObject(X) => [A,B,C,X] + notify", function() {
  var obj, before, after, item, observer;

  before = this.newFixture(3);
  item   = this.newFixture(1)[0];
  after  = [before[0], before[1], before[2], item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.pushObject(item);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});
