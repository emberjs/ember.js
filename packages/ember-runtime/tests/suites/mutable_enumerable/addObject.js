// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_enumerable');

var suite = Ember.MutableEnumerableTests;

suite.module('addObject');

suite.test("should return receiver", function() {
  var before, obj;
  before = this.newFixture(3);
  obj    = this.newObject(before);
  equal(obj.addObject(before[1]), obj, 'should return receiver');
});

suite.test("[A,B].addObject(C) => [A,B,C] + notify", function() {
  var obj, before, after, observer, item;

  before = this.newFixture(2);
  item   = this.newFixture(1)[0];
  after  = [before[0], before[1], item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

  obj.addObject(item);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    equal(observer.timesCalled('length'), 1, 'should have notified length once');
    equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
    // This gets called since MutableEnumerable is naive about changes
    equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  }
});

suite.test("[A,B,C].addObject(A) => [A,B,C] + NO notify", function() {
  var obj, before, after, observer, item;

  before = this.newFixture(3);
  after  = before;
  item   = before[0];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

  obj.addObject(item); // note: item in set

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), false, 'should NOT have notified []');
    equal(observer.validate('length'), false, 'should NOT have notified length');
    equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
    equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
  }
});

suite.test('Adding object should notify enumerable observer', function() {
  var obj = this.newObject(this.newFixture(3));
  var observer = this.newObserver(obj).observeEnumerable(obj);
  var item = this.newFixture(1)[0];

  obj.addObject(item);

  deepEqual(observer._before, [obj, null, [item]]);
  deepEqual(observer._after, [obj, null, [item]]);
});
