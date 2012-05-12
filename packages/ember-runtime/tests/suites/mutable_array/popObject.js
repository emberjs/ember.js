// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('popObject');

suite.test("[].popObject() => [] + returns undefined + NO notify", function() {
  var obj, observer;

  obj = this.newObject([]);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  equal(obj.popObject(), undefined, 'popObject results');

  deepEqual(this.toArray(obj), [], 'post item results');

  equal(observer.validate('[]'), false, 'should NOT have notified []');
  equal(observer.validate('@each'), false, 'should NOT have notified @each');
  equal(observer.validate('length'), false, 'should NOT have notified length');
  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test("[X].popObject() => [] + notify", function() {
  var obj, before, after, observer, ret;

  before = this.newFixture(1);
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  ret = obj.popObject();

  equal(ret, before[0], 'return object');
  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test("[A,B,C].popObject() => [A,B] + notify", function() {
  var obj, before, after, observer, ret;

  before = this.newFixture(3);
  after  = [before[0], before[1]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  ret = obj.popObject();

  equal(ret, before[2], 'return object');
  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});
