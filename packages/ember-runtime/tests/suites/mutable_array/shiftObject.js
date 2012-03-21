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
  observer = this.newObserver(obj, '[]', 'length');

  equal(obj.shiftObject(), undefined);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), false, 'should NOT have notified []');
    equal(observer.validate('length'), false, 'should NOT have notified length');
  }
});

suite.test("[X].shiftObject() => [] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(1);
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  equal(obj.shiftObject(), before[0], 'should return object');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C].shiftObject() => [B,C] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(3);
  after  = [before[1], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  equal(obj.shiftObject(), before[0], 'should return object');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }
});
