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
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.popObject(), undefined, 'popObject results');

  deepEqual(this.toArray(obj), [], 'post item results');
  equal(observer.validate('@each'), false, 'should NOT have notified @each');
  equal(observer.validate('length'), false, 'should NOT have notified length');
});

suite.test("[X].popObject() => [] + notify", function() {
  var obj, before, after, observer, ret;

  before = this.newFixture(1);
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  ret = obj.popObject();

  equal(ret, before[0], 'return object');
  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');
  equal(observer.validate('@each'), true, 'should NOT have notified @each');
  equal(observer.validate('length'), true, 'should NOT have notified length');
});

suite.test("[A,B,C].popObject() => [A,B] + notify", function() {
  var obj, before, after, observer, ret;

  before = this.newFixture(3);
  after  = [before[0], before[1]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  ret = obj.popObject();

  equal(ret, before[2], 'return object');
  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.validate('@each'), true, 'should NOT have notified @each');
  equal(observer.validate('length'), true, 'should NOT have notified length');
});
