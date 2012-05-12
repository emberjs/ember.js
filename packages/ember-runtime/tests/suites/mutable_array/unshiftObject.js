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
  equal(obj.unshiftObject(item), item, 'should return unshifted object');
});


suite.test("[].unshiftObject(X) => [X] + notify", function() {
  var obj, before, after, item, observer;

  before = [];
  item = this.newFixture(1)[0];
  after  = [item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObject(item);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test("[A,B,C].unshiftObject(X) => [X,A,B,C] + notify", function() {
  var obj, before, after, item, observer;

  before = this.newFixture(3);
  item = this.newFixture(1)[0];
  after  = [item, before[0], before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObject(item);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test("[A,B,C].unshiftObject(A) => [A,A,B,C] + notify", function() {
  var obj, before, after, item, observer;

  before = this.newFixture(3);
  item = before[0]; // note same object as current head. should end up twice
  after  = [item, before[0], before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObject(item);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});
