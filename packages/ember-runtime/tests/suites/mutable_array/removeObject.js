// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('removeObject');

suite.test("should return receiver", function() {
  var before, obj;
  before = this.newFixture(3);
  obj    = this.newObject(before);
  equal(obj.removeObject(before[1]), obj, 'should return receiver');
});

suite.test("[A,B,C].removeObject(B) => [A,C] + notify", function() {
  var obj, before, after, observer;

  before = this.newFixture(3);
  after  = [before[0], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  obj.removeObject(before[1]);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
    equal(observer.timesCalled('length'), 1, 'should have notified length once');
  }
});

suite.test("[A,B,C].removeObject(D) => [A,B,C]", function() {
  var obj, before, after, observer, item;

  before = this.newFixture(3);
  after  = before;
  item   = this.newFixture(1)[0];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  obj.removeObject(item); // note: item not in set

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('@each'), false, 'should NOT have notified @each');
    equal(observer.validate('length'), false, 'should NOT have notified length');
  }
});
